import { NextResponse } from "next/server";
import { getDemoFlights } from "@/lib/demo";
import type {
  DeparturesPayload,
  RawDepartureFlight,
  DepartureFlight,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["icn1"];

/**
 * ICN FIDS v0.2 Hybrid
 *
 * 1순위: 인천공항 홈페이지가 실제 표시하는 출발 목록(airport.kr)
 *   - 시간 / 목적지 / 편명 / 터미널 / 체크인 / 게이트 / 상태
 * 2순위 보강: 항공기 운항 현황 상세 조회 OpenAPI
 *   - masterFlightId / codeshare 등 코드쉐어 메타데이터 보강
 * 3순위 fallback: 여객편 운항현황(다국어) OpenAPI
 *   - airport.kr 피드를 읽지 못했을 때만 사용
 */

const HOMEPAGE_KO_URL = "https://www.airport.kr/afs/ap_ko/mainDepList.do";
const HOMEPAGE_EN_URL = "https://www.airport.kr/afs/ap_en/mainDepList.do";

const PASSENGER_API_URL =
  "https://apis.data.go.kr/B551177/StatusOfPassengerFlightsOdp/getPassengerDeparturesOdp";
const DETAIL_API_URL =
  "https://apis.data.go.kr/B551177/statusOfAllFltDeOdp/getFltDeparturesDeOdp";

const HOMEPAGE_REVALIDATE_SECONDS = 30;
const PASSENGER_REVALIDATE_SECONDS = 120;
// 개발계정 500회/일을 고려해 상세 API는 10분 캐시로 호출량을 억제
const DETAIL_REVALIDATE_SECONDS = 600;

// 최대 2페이지(페이지당 15편) 운용을 목표로 향후 운항편을 보강한다.
// 화면에는 터미널별 최대 30개 실제 운항까지만 유지한다.
const DISPLAY_HORIZON_MINUTES = 8 * 60;
const TARGET_OPERATIONS_PER_TERMINAL = 30;
const MIDNIGHT_ROLLOVER_UNTIL_MINUTE = 2 * 60;

function kstParts(date = new Date()) {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function minuteToHHMM(total: number) {
  const clamped = Math.max(0, Math.min(24 * 60, total));
  if (clamped === 24 * 60) return "2400";
  return `${pad2(Math.floor(clamped / 60))}${pad2(clamped % 60)}`;
}

type DetailQuery = {
  searchDate: string;
  searchFrom: string;
  searchTo: string;
};

function makeWindow(): DetailQuery {
  const p = kstParts();
  const searchDate = `${p.year}${pad2(p.month)}${pad2(p.day)}`;
  const nowMinutes = p.hour * 60 + p.minute;
  const bucket = Math.floor(nowMinutes / 30) * 30;

  return {
    searchDate,
    searchFrom: minuteToHHMM(bucket - 30),
    searchTo: minuteToHHMM(bucket + 180),
  };
}

/**
 * 실제 홈페이지 피드는 현재 시점 주변 운항편을 기준으로 사용하고,
 * 최대 2페이지 분량을 안정적으로 확보하기 위한 미래편은 상세 OpenAPI에서 보강한다.
 * 8시간 범위가 자정을 넘으면 오늘/내일 2개 요청으로 분리한다.
 */
function makeDetailHorizonQueries(): DetailQuery[] {
  const p = kstParts();
  const today = `${p.year}${pad2(p.month)}${pad2(p.day)}`;
  const nowMinutes = p.hour * 60 + p.minute;
  const bucket = Math.floor(nowMinutes / 30) * 30;
  const start = Math.max(0, bucket - 30);
  const absoluteEnd = nowMinutes + DISPLAY_HORIZON_MINUTES;

  const queries: DetailQuery[] = [
    {
      searchDate: today,
      searchFrom: minuteToHHMM(start),
      searchTo: minuteToHHMM(Math.min(24 * 60, absoluteEnd)),
    },
  ];

  if (absoluteEnd > 24 * 60) {
    queries.push({
      searchDate: addDays(today, 1),
      searchFrom: "0000",
      searchTo: minuteToHHMM(Math.min(24 * 60, absoluteEnd - 24 * 60)),
    });
  }

  return queries.filter((q) => q.searchFrom !== q.searchTo);
}

function makeRolloverQuery(): DetailQuery | null {
  const p = kstParts();
  const nowMinutes = p.hour * 60 + p.minute;
  if (nowMinutes >= MIDNIGHT_ROLLOVER_UNTIL_MINUTE) return null;

  const today = `${p.year}${pad2(p.month)}${pad2(p.day)}`;
  return {
    searchDate: addDays(today, -1),
    searchFrom: "1800",
    searchTo: "2400",
  };
}

function normalizeServiceKey(raw: string) {
  const key = raw.trim();
  if (!/%[0-9A-Fa-f]{2}/.test(key)) return key;
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function addDays(yyyymmdd: string, days: number) {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(
    date.getUTCDate()
  )}`;
}

function hhmmToMinutes(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const hh = Number(digits.slice(-4, -2));
  const mm = Number(digits.slice(-2));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh === 24 && mm === 0) return 24 * 60;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function toFullKstDateTime(
  value: string | undefined,
  searchDate: string,
  scheduleValue?: string
) {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length >= 12) return digits.slice(0, 12);
  if (digits.length < 4) return "";

  const hhmm = digits.slice(-4);
  let date = searchDate;

  if (scheduleValue) {
    const scheduleMinutes = hhmmToMinutes(scheduleValue);
    const estimatedMinutes = hhmmToMinutes(hhmm);
    if (scheduleMinutes !== null && estimatedMinutes !== null) {
      if (estimatedMinutes + 12 * 60 < scheduleMinutes) {
        date = addDays(searchDate, 1);
      } else if (estimatedMinutes - 12 * 60 > scheduleMinutes) {
        date = addDays(searchDate, -1);
      }
    }
  }

  if (hhmm === "2400") return `${addDays(date, 1)}0000`;
  return `${date}${hhmm}`;
}

function clean(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanOperationalRemark(value: unknown) {
  return clean(value)
    .replace(/\bcode\s*share\b/gi, "")
    .replace(/\bcodeshare\b/gi, "")
    .replace(/\bcodeshar\b/gi, "")
    .replace(/코드\s*쉐어/gi, "")
    .replace(/공동\s*운항/gi, "")
    .replace(/^[\s\/|·•,-]+|[\s\/|·•,-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isDepartedRemark(value: unknown) {
  const status = cleanOperationalRemark(value).trim();
  if (!status) return false;

  return (
    /^출발(?:\s*완료)?$/i.test(status) ||
    /^departed(?:\s|$)/i.test(status)
  );
}

function removeDepartedFlights(flights: DepartureFlight[]) {
  return flights.filter((flight) => !isDepartedRemark(flight.remark));
}

function terminalLabel(id: string) {
  if (id === "P03") return "T2";
  if (id === "P01" || id === "P02") return "T1";
  return id || "-";
}

function terminalIdFromHomepage(value: string) {
  const t = value.toUpperCase().replace(/\s+/g, "");
  if (t.includes("T2")) return "P03";
  if (t.includes("T1")) return "P01";
  return "";
}

function normalizeFlightId(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function sortKey(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits.slice(0, 12)) || Number.MAX_SAFE_INTEGER;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractItems(json: any): {
  rawItems: RawDepartureFlight[];
  resultCode?: unknown;
  resultMsg?: unknown;
} {
  const responseNode = json?.response ?? json;
  if (Array.isArray(responseNode)) {
    return { rawItems: responseNode as RawDepartureFlight[] };
  }
  if (Array.isArray(json)) {
    return { rawItems: json as RawDepartureFlight[] };
  }

  const header = responseNode?.header ?? json?.header;
  const body = responseNode?.body ?? json?.body;
  const itemData =
    body?.items?.item ??
    body?.items ??
    body?.item ??
    responseNode?.items?.item ??
    responseNode?.items ??
    responseNode?.item;

  return {
    rawItems: asArray<RawDepartureFlight>(itemData),
    resultCode: header?.resultCode ?? responseNode?.resultCode,
    resultMsg: header?.resultMsg ?? responseNode?.resultMsg,
  };
}

function assertOpenApiSuccess(resultCode: unknown, resultMsg: unknown) {
  if (resultCode === undefined || resultCode === null) return;
  const code = String(resultCode).trim().toUpperCase();
  if (!["00", "0", "NORMAL SERVICE"].includes(code)) {
    throw new Error(`OpenAPI 오류 ${code}: ${resultMsg ?? "Unknown error"}`);
  }
}

function normalizeOpenApiFlight(
  raw: RawDepartureFlight,
  index: number,
  searchDate: string
): DepartureFlight {
  const rawSchedule = clean(raw.scheduleDateTime ?? raw.scheduleDatetime);
  const rawEstimated = clean(
    raw.estimatedDateTime ?? raw.estimatedDatetime,
    rawSchedule
  );
  const schedule = toFullKstDateTime(rawSchedule, searchDate);
  const estimated =
    toFullKstDateTime(rawEstimated, searchDate, rawSchedule) || schedule;
  const flightId = clean(raw.flightId, "-");
  const terminalId = clean(raw.terminalId);

  return {
    id: clean(raw.fid) || `${flightId}-${schedule}-${index}`,
    flightId,
    masterFlightId: clean(
      raw.masterFlightId ?? raw.masterflightid ?? raw.masterFlightid
    ),
    airline: clean(raw.airline, "-"),
    airport: clean(raw.airport, "-"),
    airportCode: clean(raw.airportCode ?? raw.cityCode).toUpperCase(),
    scheduleDateTime: schedule,
    estimatedDateTime: estimated,
    checkin: clean(
      raw.chkinRange ??
        raw.chkinrange ??
        raw.checkin ??
        raw.checkIn ??
        raw.counter,
      "-"
    ),
    gate: clean(raw.gateNumber ?? raw.gatenumber, "-"),
    terminalId,
    terminalLabel: terminalLabel(terminalId),
    remark: cleanOperationalRemark(raw.remark ?? raw.tmp1),
    codeshare: clean(raw.codeshare ?? raw.codeShare),
  };
}

function decodeHtmlEntities(input: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 16));
      } catch {
        return "";
      }
    })
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

/** DOM 구조가 바뀌어도 라벨 텍스트가 유지되는 한 동작하도록 HTML을 텍스트화한다. */
function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi, " $1 ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:tr|td|th|li|div|p|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

type HomepageLocale = "ko" | "en";

type HomepageFlight = DepartureFlight;

function parseTimeField(field: string) {
  const times = field.match(/([0-2]\d):([0-5]\d)/g) ?? [];
  if (times.length === 0) return null;

  // 홈페이지에서 시간이 바뀐 경우 접근성 텍스트는
  // "22:30 취소됨20:45"처럼 현재/변경 시간이 먼저, 기존 예정시간이 뒤에 온다.
  const estimated = times[0]!.replace(":", "");
  const schedule = (times.length > 1 ? times[times.length - 1]! : times[0]!).replace(
    ":",
    ""
  );
  return { schedule, estimated };
}

function parseDestination(field: string) {
  const value = clean(field, "-");
  const match = value.match(/^(.*?)\s*\(([A-Z0-9]{3})\)\s*$/i);
  if (!match) return { name: value, code: "" };
  return { name: clean(match[1], "-"), code: match[2].toUpperCase() };
}

function parseFlightAndAirline(field: string) {
  const value = clean(field);
  const flightMatch = value.match(/(?:^|\s)([A-Z0-9]{2}\s*\d{1,4}[A-Z]?)(?=\s|\/|$)/i);
  if (!flightMatch) return null;

  const flightId = normalizeFlightId(flightMatch[1]);
  const slash = value.lastIndexOf("/");
  const airline = slash >= 0 ? clean(value.slice(slash + 1), "-") : "-";
  return { flightId, airline };
}

function parseHomepageFlights(
  html: string,
  locale: HomepageLocale,
  searchDate: string
): HomepageFlight[] {
  const text = htmlToText(html);

  const pattern =
    locale === "ko"
      ? /출발시간\s*:\s*([\s\S]*?)\s*목적지\s*:\s*([\s\S]*?)\s*운항편명\s*\/\s*항공사\s*:\s*([\s\S]*?)\s*터미널\s*:\s*([\s\S]*?)\s*체크인\s*카운터\s*:\s*([\s\S]*?)\s*탑승구\s*:\s*([\s\S]*?)\s*출발현황\s*:\s*([\s\S]*?)(?=출발시간\s*:|$)/g
      : /Departure\s*Time\s*:\s*([\s\S]*?)\s*To\s*:\s*([\s\S]*?)\s*Airline\s*\/\s*Flight\s*No\.?\s*:\s*([\s\S]*?)\s*Terminal\s*:\s*([\s\S]*?)\s*Check-in\s*Counter\s*:\s*([\s\S]*?)\s*Gate\s*:\s*([\s\S]*?)\s*Departure\s*Conditions\s*:\s*([\s\S]*?)(?=Departure\s*Time\s*:|$)/gi;

  const flights: HomepageFlight[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    const time = parseTimeField(match[1]);
    const destination = parseDestination(match[2]);
    const flightAndAirline = parseFlightAndAirline(match[3]);
    if (!time || !flightAndAirline) continue;

    const terminalId = terminalIdFromHomepage(match[4]);
    if (!terminalId) continue;

    // 자정 직후 홈페이지가 전날 늦은 지연편을 계속 내보내는 경우
    // 23:xx를 오늘 밤으로 오인하지 않도록 전날 날짜를 붙인다.
    const nowKst = kstParts();
    const nowMinutes = nowKst.hour * 60 + nowKst.minute;
    const scheduleMinutes = hhmmToMinutes(time.schedule);
    const scheduleDate =
      nowMinutes < MIDNIGHT_ROLLOVER_UNTIL_MINUTE &&
      scheduleMinutes !== null &&
      scheduleMinutes >= 18 * 60
        ? addDays(searchDate, -1)
        : searchDate;

    const schedule = toFullKstDateTime(time.schedule, scheduleDate);
    const estimated =
      toFullKstDateTime(time.estimated, scheduleDate, time.schedule) || schedule;

    flights.push({
      id: `homepage-${locale}-${flightAndAirline.flightId}-${schedule}-${index++}`,
      flightId: flightAndAirline.flightId,
      masterFlightId: "",
      airline: flightAndAirline.airline,
      airport: destination.name,
      airportCode: destination.code,
      scheduleDateTime: schedule,
      estimatedDateTime: estimated,
      checkin: clean(match[5], "-"),
      gate: clean(match[6], "-"),
      terminalId,
      terminalLabel: terminalLabel(terminalId),
      remark: cleanOperationalRemark(match[7]),
      codeshare: "",
    });
  }

  return flights;
}

async function fetchHomepage(locale: HomepageLocale, searchDate: string) {
  const url = locale === "ko" ? HOMEPAGE_KO_URL : HOMEPAGE_EN_URL;
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": locale === "ko" ? "ko-KR,ko;q=0.9" : "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; ICN-FIDS/0.2; +https://www.airport.kr/)",
    },
    next: { revalidate: HOMEPAGE_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`airport.kr ${locale} HTTP ${response.status}`);
  }

  const html = await response.text();
  const flights = parseHomepageFlights(html, locale, searchDate);
  if (flights.length === 0) {
    throw new Error(`airport.kr ${locale} 출발편 파싱 결과가 0건입니다.`);
  }
  return flights;
}

function homepageMatchKey(flight: DepartureFlight) {
  return `${normalizeFlightId(flight.flightId)}|${flight.airportCode}|${flight.terminalLabel}`;
}

function mergeHomepageLanguages(
  korean: DepartureFlight[],
  english: DepartureFlight[]
) {
  const enBuckets = new Map<string, DepartureFlight[]>();
  for (const flight of english) {
    const key = homepageMatchKey(flight);
    const list = enBuckets.get(key) ?? [];
    list.push(flight);
    enBuckets.set(key, list);
  }

  return korean.map((ko) => {
    const key = homepageMatchKey(ko);
    const candidates = enBuckets.get(key) ?? [];
    const en = candidates.shift();
    if (candidates.length === 0) enBuckets.delete(key);
    else enBuckets.set(key, candidates);

    return {
      ...ko,
      airportEnglish: en?.airport || undefined,
      airlineEnglish: en?.airline || undefined,
      remarkEnglish: en?.remark || undefined,
    };
  });
}

async function fetchPassengerFallback(
  serviceKey: string,
  query: ReturnType<typeof makeWindow>
) {
  const params = new URLSearchParams({
    serviceKey,
    from_time: query.searchFrom,
    to_time: query.searchTo,
    lang: "K",
    type: "json",
  });

  const response = await fetch(`${PASSENGER_API_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: PASSENGER_REVALIDATE_SECONDS },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`여객편 OpenAPI HTTP ${response.status}`);

  const json = JSON.parse(text);
  const { rawItems, resultCode, resultMsg } = extractItems(json);
  assertOpenApiSuccess(resultCode, resultMsg);

  return rawItems
    .map((raw, index) => normalizeOpenApiFlight(raw, index, query.searchDate))
    .filter((flight) => ["P01", "P02", "P03"].includes(flight.terminalId))
    .sort(
      (a, b) =>
        sortKey(a.scheduleDateTime) - sortKey(b.scheduleDateTime) ||
        a.flightId.localeCompare(b.flightId)
    );
}

async function fetchDetailFlights(
  serviceKey: string,
  query: DetailQuery
) {
  const params = new URLSearchParams({
    serviceKey,
    type: "json",
    searchdtCode: "S",
    searchDate: query.searchDate,
    searchFrom: query.searchFrom,
    searchTo: query.searchTo,
    passengerOrCargo: "P",
    numOfRows: "500",
    pageNo: "1",
  });

  const response = await fetch(`${DETAIL_API_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: DETAIL_REVALIDATE_SECONDS },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`상세 OpenAPI HTTP ${response.status}`);

  const json = JSON.parse(text);
  const { rawItems, resultCode, resultMsg } = extractItems(json);
  assertOpenApiSuccess(resultCode, resultMsg);

  return rawItems
    .map((raw, index) => normalizeOpenApiFlight(raw, index, query.searchDate))
    .filter((flight) => ["P01", "P02", "P03"].includes(flight.terminalId));
}

function buildDetailMetadata(flights: DepartureFlight[]) {
  const metadata = new Map<
    string,
    { masterFlightId: string; codeshare: string; airline: string }
  >();

  flights.forEach((flight) => {
    const flightId = normalizeFlightId(flight.flightId);
    if (!flightId) return;
    metadata.set(flightId, {
      masterFlightId: normalizeFlightId(flight.masterFlightId),
      codeshare: flight.codeshare,
      airline: flight.airline,
    });
  });

  return metadata;
}

function enrichWithDetail(
  flights: DepartureFlight[],
  detail: Map<string, { masterFlightId: string; codeshare: string; airline: string }>
) {
  return flights.map((flight) => {
    const meta = detail.get(normalizeFlightId(flight.flightId));
    if (!meta) return flight;
    return {
      ...flight,
      masterFlightId: meta.masterFlightId || flight.masterFlightId,
      codeshare: meta.codeshare || flight.codeshare,
      airline: flight.airline === "-" ? meta.airline || "-" : flight.airline,
    };
  });
}

function flightEpoch(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return Number.NaN;
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  const hh = Number(digits.slice(8, 10));
  const mm = Number(digits.slice(10, 12));
  return Date.UTC(y, m - 1, d, hh - 9, mm);
}

function isActiveRemark(value: string) {
  const s = cleanOperationalRemark(value).toLowerCase();
  return (
    s.includes("지연") ||
    s.includes("delay") ||
    s.includes("탑승") ||
    s.includes("boarding") ||
    s.includes("final") ||
    s.includes("마감") ||
    s.includes("gate open") ||
    s.includes("ready") ||
    s.includes("수속") ||
    s.includes("check-in")
  );
}

/** 상세 API 보강편 중 과거의 오래된 행은 제외하고 미래/현재 운항편만 남긴다. */
function isFutureOrOperational(flight: DepartureFlight, now = Date.now()) {
  if (isDepartedRemark(flight.remark)) return false;
  const time = flightEpoch(flight.estimatedDateTime || flight.scheduleDateTime);
  if (!Number.isFinite(time)) return isActiveRemark(flight.remark);
  return time >= now - 30 * 60 * 1000 || isActiveRemark(flight.remark);
}

/**
 * 00:00~02:00에는 전날 18:00~24:00 예정편 중 아직 출발하지 않은 편을 보호한다.
 * 변경시간이 오늘로 넘어온 편 또는 지연/탑승 등 활성 상태가 확인된 편만 유지한다.
 */
function isProtectedRolloverFlight(
  flight: DepartureFlight,
  today: string,
  now = Date.now()
) {
  if (isDepartedRemark(flight.remark)) return false;

  const estimatedDigits = (flight.estimatedDateTime || "").replace(/\D/g, "");
  const estimatedDay = estimatedDigits.slice(0, 8);
  if (estimatedDay === today) return true;

  const scheduleTime = flightEpoch(flight.scheduleDateTime);
  if (!Number.isFinite(scheduleTime)) return isActiveRemark(flight.remark);

  // 전날 늦은 편이 아직 지연/탑승 상태라면 자정 이후 최대 8시간 범위에서 유지.
  return isActiveRemark(flight.remark) && now - scheduleTime <= 8 * 60 * 60 * 1000;
}

function flightIdentityKey(flight: DepartureFlight) {
  const scheduleDay = flight.scheduleDateTime.replace(/\D/g, "").slice(0, 8);
  return [
    normalizeFlightId(flight.flightId),
    scheduleDay,
    flight.airportCode.trim().toUpperCase(),
    terminalLabel(flight.terminalId),
  ].join("|");
}

function mergeHomepageWithDetail(
  homepageFlights: DepartureFlight[],
  detailFlights: DepartureFlight[]
) {
  const result = [...homepageFlights];
  const seen = new Set(result.map(flightIdentityKey));

  for (const flight of detailFlights) {
    const key = flightIdentityKey(flight);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(flight);
  }

  return result;
}

function operationIdentity(flight: DepartureFlight) {
  const master = normalizeFlightId(flight.masterFlightId || "");
  const day = flight.scheduleDateTime.replace(/\D/g, "").slice(0, 8);
  const airportCode = flight.airportCode.trim().toUpperCase();

  if (master) {
    return `master:${master}:${airportCode}:${day}`;
  }

  return [
    "operation",
    airportCode,
    flight.scheduleDateTime,
    flight.estimatedDateTime,
    terminalLabel(flight.terminalId),
    flight.gate.trim(),
    flight.checkin.trim(),
  ].join("|");
}

/**
 * 각 터미널별 첫 30개 실제 운항 묶음을 남긴다.
 * PAGE_SIZE=15 기준 T1/T2 각각 최대 2페이지 분량이며,
 * 코드쉐어 행은 같은 운항 묶음으로 계산한다.
 */
function limitOperationsPerTerminal(flights: DepartureFlight[]) {
  const selected = new Set<string>();
  const counts = new Map<"T1" | "T2", number>([
    ["T1", 0],
    ["T2", 0],
  ]);

  return flights.filter((flight) => {
    const terminal: "T1" | "T2" = flight.terminalId === "P03" ? "T2" : "T1";
    const operation = `${terminal}|${operationIdentity(flight)}`;

    if (selected.has(operation)) return true;
    if ((counts.get(terminal) ?? 0) >= TARGET_OPERATIONS_PER_TERMINAL) return false;

    selected.add(operation);
    counts.set(terminal, (counts.get(terminal) ?? 0) + 1);
    return true;
  });
}

export async function GET() {
  const query = makeWindow();
  const demoMode = process.env.FIDS_DEMO_MODE === "true";
  const rawKey = process.env.INCHEON_API_KEY;

  if (demoMode) {
    const payload: DeparturesPayload = {
      flights: getDemoFlights(),
      updatedAt: new Date().toISOString(),
      source: "demo",
      dataSources: ["demo"],
      query,
    };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  }

  const serviceKey = rawKey ? normalizeServiceKey(rawKey) : "";
  const dataSources: string[] = [];
  const horizonQueries = makeDetailHorizonQueries();
  const rolloverQuery = makeRolloverQuery();
  const today = query.searchDate;

  async function loadDetailSupport() {
    if (!serviceKey) {
      return { horizonFlights: [] as DepartureFlight[], rolloverFlights: [] as DepartureFlight[] };
    }

    const horizonResults = await Promise.allSettled(
      horizonQueries.map((detailQuery) => fetchDetailFlights(serviceKey, detailQuery))
    );

    const horizonFlights = horizonResults.flatMap((result, index) => {
      if (result.status === "fulfilled") return result.value;
      console.warn(
        `[ICN FIDS] 상세 OpenAPI 미래편 보강 실패 (${horizonQueries[index]?.searchDate} ${horizonQueries[index]?.searchFrom}-${horizonQueries[index]?.searchTo})`,
        result.reason instanceof Error ? result.reason.message : result.reason
      );
      return [];
    });

    let rolloverFlights: DepartureFlight[] = [];
    if (rolloverQuery) {
      try {
        rolloverFlights = await fetchDetailFlights(serviceKey, rolloverQuery);
      } catch (error) {
        console.warn(
          "[ICN FIDS] 자정 전환 보호용 전날 상세 API 조회 실패",
          error instanceof Error ? error.message : error
        );
      }
    }

    return { horizonFlights, rolloverFlights };
  }

  try {
    // 홈페이지 한국어 피드가 현재 표출값의 기준이다. 영어 피드는 목적지 영문표기 보강용.
    const [koResult, enResult, detailSupportResult] = await Promise.allSettled([
      fetchHomepage("ko", query.searchDate),
      fetchHomepage("en", query.searchDate),
      loadDetailSupport(),
    ]);

    if (koResult.status !== "fulfilled") {
      throw koResult.reason;
    }

    let flights = koResult.value;
    dataSources.push("airport.kr/ap_ko");

    if (enResult.status === "fulfilled") {
      flights = mergeHomepageLanguages(flights, enResult.value);
      dataSources.push("airport.kr/ap_en");
    } else {
      console.warn("[ICN FIDS] 영문 홈페이지 피드 보강 실패", enResult.reason);
    }

    if (detailSupportResult.status === "fulfilled" && serviceKey) {
      const { horizonFlights, rolloverFlights } = detailSupportResult.value;
      const allDetailFlights = [...horizonFlights, ...rolloverFlights];

      if (allDetailFlights.length > 0) {
        // 상세 API는 홈페이지 현재값을 덮어쓰지 않고 코드쉐어 메타데이터만 보강한다.
        const metadata = buildDetailMetadata(allDetailFlights);
        flights = enrichWithDetail(flights, metadata);

        // 홈페이지 피드 이후 시간대의 미래 운항편을 상세 API에서 보강하되 최대 2페이지 분량으로 제한한다.
        const futureFlights = horizonFlights
          .filter((flight) => isFutureOrOperational(flight))
          .map((flight) => ({ ...flight }));
        flights = mergeHomepageWithDetail(flights, futureFlights);
        dataSources.push("detail-openapi-horizon");

        // 00:00~02:00에는 전날 예정이었지만 아직 출발하지 않은 지연/미출발편을 유지한다.
        if (rolloverQuery && rolloverFlights.length > 0) {
          const protectedFlights = rolloverFlights.filter((flight) =>
            isProtectedRolloverFlight(flight, today)
          );
          if (protectedFlights.length > 0) {
            flights = mergeHomepageWithDetail(flights, protectedFlights);
            dataSources.push("detail-openapi-rollover");
          }
        }
      }
    } else if (detailSupportResult.status === "rejected") {
      console.warn(
        "[ICN FIDS] 상세 OpenAPI 보강 전체 실패(홈페이지 데이터는 계속 사용)",
        detailSupportResult.reason instanceof Error
          ? detailSupportResult.reason.message
          : detailSupportResult.reason
      );
    }

    // "출발" 상태도 브라우저에 전달한다. 클라이언트가 최초 관측 후 5분 동안 표시한 뒤 제거한다.

    flights.sort(
      (a, b) =>
        sortKey(a.scheduleDateTime) - sortKey(b.scheduleDateTime) ||
        a.flightId.localeCompare(b.flightId)
    );

    // 코드쉐어를 한 실제 운항으로 계산해 T1/T2 각각 최대 30운항(15편 × 2페이지)만 남긴다.
    flights = limitOperationsPerTerminal(flights);

    const payload: DeparturesPayload = {
      flights,
      updatedAt: new Date().toISOString(),
      source: "airport.kr",
      dataSources,
      query,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${HOMEPAGE_REVALIDATE_SECONDS}, stale-while-revalidate=15`,
      },
    });
  } catch (homepageError) {
    console.error(
      "[ICN FIDS] airport.kr 피드 실패 — 여객 OpenAPI fallback 시도",
      homepageError instanceof Error ? homepageError.message : homepageError
    );

    if (!serviceKey) {
      return NextResponse.json(
        {
          error: "airport.kr 피드를 읽지 못했고 fallback용 INCHEON_API_KEY도 없습니다.",
        },
        { status: 502 }
      );
    }

    try {
      let flights = await fetchPassengerFallback(serviceKey, query);
      dataSources.push("passenger-openapi-fallback");

      try {
        const { horizonFlights, rolloverFlights } = await loadDetailSupport();
        const allDetailFlights = [...horizonFlights, ...rolloverFlights];
        const metadata = buildDetailMetadata(allDetailFlights);
        flights = enrichWithDetail(flights, metadata);

        const futureFlights = horizonFlights.filter((flight) =>
          isFutureOrOperational(flight)
        );
        flights = mergeHomepageWithDetail(flights, futureFlights);
        if (futureFlights.length > 0) dataSources.push("detail-openapi-horizon");

        if (rolloverQuery) {
          const protectedFlights = rolloverFlights.filter((flight) =>
            isProtectedRolloverFlight(flight, today)
          );
          flights = mergeHomepageWithDetail(flights, protectedFlights);
          if (protectedFlights.length > 0) dataSources.push("detail-openapi-rollover");
        }
      } catch (error) {
        console.warn(
          "[ICN FIDS] fallback 상태의 상세 API 보강 실패",
          error instanceof Error ? error.message : error
        );
      }

      // fallback에서도 "출발" 상태를 전달해 동일한 5분 유예 표시를 적용한다.
      flights.sort(
        (a, b) =>
          sortKey(a.scheduleDateTime) - sortKey(b.scheduleDateTime) ||
          a.flightId.localeCompare(b.flightId)
      );
      flights = limitOperationsPerTerminal(flights);

      const payload: DeparturesPayload = {
        flights,
        updatedAt: new Date().toISOString(),
        source: "passenger_api",
        dataSources,
        query,
      };

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": `public, s-maxage=${PASSENGER_REVALIDATE_SECONDS}, stale-while-revalidate=30`,
        },
      });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          error: `홈페이지 피드와 여객편 OpenAPI 모두 실패했습니다: ${
            fallbackError instanceof Error ? fallbackError.message : "Unknown error"
          }`,
        },
        { status: 502 }
      );
    }
  }
}
