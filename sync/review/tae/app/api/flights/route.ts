import { NextRequest, NextResponse } from "next/server";
import { demoFlights } from "@/lib/demo";
import type { FidsFlight, FlightMode, FlightsPayload, RawKacFlight } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

const AIRPORT_CODE = "TAE" as const;
const KAC_GW_BASE = "https://apis.data.go.kr/B551178/flight-status";
const HOMEPAGE_ENDPOINT = "https://www.airport.co.kr/daegu/ajaxf/frPryInfoSvc/getPryInfoList.do";
const REFERER = "https://www.airport.co.kr/daegu/cms/frCon/index.do?MENU_ID=100";

const CACHE_SECONDS = 45;
const REQUEST_TIMEOUT_MS = 10_000;
const INFO_REVALIDATE_SECONDS = 45;
const OPERATION_REVALIDATE_SECONDS = 300;
const DETAIL_REVALIDATE_SECONDS = 600;
const DETAIL_PAGE_SIZE = 100;
const DETAIL_LOOKBACK_MS = 3 * 60 * 60_000;
const DETAIL_LOOKAHEAD_MS = 4 * 60 * 60_000;

type GwPage = {
  items: RawKacFlight[];
  totalCount: number;
};

const text = (value: unknown, fallback = "") =>
  value === null || value === undefined ? fallback : String(value).trim();

function first(raw: RawKacFlight, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = text(raw[key]);
    if (value) return value;
  }
  return fallback;
}

function normalizedFlightId(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function kstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = read("year");
  const month = read("month");
  const day = read("day");
  return { date: `${year}${month}${day}`, formDate: `${year}-${month}-${day}` };
}

function addDays(date: string, amount: number) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(4, 6));
  const d = Number(date.slice(6, 8));
  const next = new Date(Date.UTC(y, m - 1, d + amount));
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`;
}

function hhmm(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 12) return digits.slice(8, 12);
  if (digits.length >= 4) return digits.slice(-4);
  return digits.padStart(4, "0");
}

function hhmmMinutes(value: string) {
  const time = hhmm(value);
  if (!time || time === "2400") return time === "2400" ? 1440 : Number.NaN;
  const hours = Number(time.slice(0, 2));
  const minutes = Number(time.slice(2, 4));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

function fullDateTime(value: string, date: string, scheduledValue = "") {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 12) return digits.slice(0, 12);
  const time = hhmm(value);
  if (!time) return "";
  if (time === "2400") return `${addDays(date, 1)}0000`;

  let targetDate = date;
  const scheduled = hhmm(scheduledValue);
  if (scheduled) {
    const scheduledMinutes = Number(scheduled.slice(0, 2)) * 60 + Number(scheduled.slice(2));
    const valueMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(2));
    if (valueMinutes + 720 < scheduledMinutes) targetDate = addDays(date, 1);
    if (valueMinutes - 720 > scheduledMinutes) targetDate = addDays(date, -1);
  }
  return `${targetDate}${time}`;
}

function dateTimeEpoch(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return Number.NaN;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  return Date.UTC(year, month - 1, day, hour - 9, minute);
}

function normalizeType(value: string): "국내선" | "국제선" {
  const normalized = value.toLowerCase();
  return normalized.includes("국제") || normalized === "i" || normalized.includes("international")
    ? "국제선"
    : "국내선";
}

function isCompleteStatus(value: string) {
  return /^(출발|출발완료|도착|departed|arrived)$/i.test(value.replace(/\s/g, ""));
}

function normalizeGwInfoFlight(raw: RawKacFlight, mode: FlightMode, index: number, date: string): FidsFlight {
  const departure = mode === "departures";
  const scheduleRaw = first(raw, ["std", "STD", "scheduledatetime"]);
  const estimatedRaw = first(raw, ["etd", "ETD", "estimateddatetime"], scheduleRaw);
  const flightId = normalizedFlightId(first(raw, ["airFln", "AIR_FLN", "flightid"], "-"));
  const remark = first(raw, ["rmkKor", "RMK_KOR"]);
  const airportCode = first(raw, ["city", "CITY"], "").toUpperCase();

  return {
    id: `${date}-${mode}-${flightId}-${scheduleRaw}-${index}`,
    mode,
    flightId,
    masterFlightId: normalizedFlightId(first(raw, ["masterflightid", "MASTER_FLN"])),
    airline: first(raw, ["airlineKorean", "AIRLINE_KOREAN", "airline"], "-"),
    airlineEnglish: first(raw, ["airlineEnglish", "AIRLINE_ENGLISH"]),
    airport: departure
      ? first(raw, ["arrivedKor", "ARRIVED_KOR", "arrAirport"], "-")
      : first(raw, ["boardingKor", "BOARDING_KOR", "depAirport"], "-"),
    airportEnglish: departure
      ? first(raw, ["arrivedEng", "ARRIVED_ENG", "arrAirportEng"])
      : first(raw, ["boardingEng", "BOARDING_ENG", "depAirportEng"]),
    airportCode,
    scheduleDateTime: fullDateTime(scheduleRaw, date),
    estimatedDateTime: fullDateTime(estimatedRaw, date, scheduleRaw) || fullDateTime(scheduleRaw, date),
    actualDateTime: isCompleteStatus(remark) ? fullDateTime(estimatedRaw, date, scheduleRaw) : "",
    facility: departure ? first(raw, ["gate", "GATE"], "-") : first(raw, ["baggageClaim", "BAGGAGE_CLAIM"], "-"),
    facilityLabel: departure ? "탑승구" : "수하물",
    flightType: normalizeType(first(raw, ["line", "LINE"])),
    remark,
    remarkEnglish: first(raw, ["rmkEng", "RMK_ENG"]),
    codeshare: first(raw, ["codeshare", "CDSR_YN"]),
  };
}

function normalizeGwOperationFlight(raw: RawKacFlight, mode: FlightMode, index: number, date: string): FidsFlight {
  const departure = mode === "departures";
  const scheduleRaw = first(raw, ["scheduledatetime", "scheduleDateTime"]);
  const estimatedRaw = first(raw, ["estimateddatetime", "estimatedDateTime"], scheduleRaw);
  const operationDate = first(raw, ["searchday"], date).replace(/\D/g, "").slice(0, 8) || date;
  const flightId = normalizedFlightId(first(raw, ["flightid", "flightId"], "-"));
  const remark = first(raw, ["rmkKor", "remark"]);
  const airportCode = (
    departure
      ? first(raw, ["arrvAirportCode", "arrAirportCode"])
      : first(raw, ["depAirportCode"])
  ).toUpperCase();

  return {
    id: `${operationDate}-${mode}-${flightId}-${scheduleRaw}-op-${index}`,
    mode,
    flightId,
    masterFlightId: normalizedFlightId(first(raw, ["masterflightid", "masterFlightId"])),
    airline: first(raw, ["airline"], "-"),
    airport: departure ? first(raw, ["arrAirport"], "-") : first(raw, ["depAirport"], "-"),
    airportEnglish: departure ? first(raw, ["arrAirportEng"]) : first(raw, ["depAirportEng"]),
    airportCode,
    scheduleDateTime: fullDateTime(scheduleRaw, operationDate),
    estimatedDateTime: fullDateTime(estimatedRaw, operationDate, scheduleRaw) || fullDateTime(scheduleRaw, operationDate),
    actualDateTime: isCompleteStatus(remark) ? fullDateTime(estimatedRaw, operationDate, scheduleRaw) : "",
    facility: "-",
    facilityLabel: departure ? "탑승구" : "수하물",
    flightType: normalizeType(first(raw, ["line"])),
    remark,
    codeshare: first(raw, ["codeshare"]),
  };
}

function normalizeHomepageFlight(raw: RawKacFlight, mode: FlightMode, index: number, date: string): FidsFlight {
  const departure = mode === "departures";
  const scheduleRaw = first(raw, ["STD", "std"]);
  const estimatedRaw = first(raw, ["ETD", "ETD1", "etd"], scheduleRaw);
  const flightId = normalizedFlightId(first(raw, ["AIR_FLN", "airFln", "FLN", "fln"], "-"));
  const remark = first(raw, ["RMK_KOR", "rmkKor"]);
  const operationDate = first(raw, ["ACT_C_DATE"], date).replace(/\D/g, "").slice(0, 8) || date;

  return {
    id: `${operationDate}-${mode}-${flightId}-${scheduleRaw}-${index}`,
    mode,
    flightId,
    masterFlightId: normalizedFlightId(first(raw, ["CDSR_MST_FL_NM", "masterFln"])),
    airline: first(raw, ["AIR_KOR", "airlineKorean"], "-"),
    airlineEnglish: first(raw, ["AIR_ENG", "airlineEnglish"]),
    airport: first(raw, ["ARRIVED_KOR", "VIA_KOR", "arrivedKor"], "-"),
    airportEnglish: first(raw, ["ARRIVED_ENG", "VIA_ENG", "arrivedEng"]),
    airportCode: first(raw, ["CITY", "VIA", "city"], "").toUpperCase(),
    scheduleDateTime: fullDateTime(scheduleRaw, operationDate),
    estimatedDateTime: fullDateTime(estimatedRaw, operationDate, scheduleRaw) || fullDateTime(scheduleRaw, operationDate),
    actualDateTime: isCompleteStatus(remark) ? fullDateTime(estimatedRaw, operationDate, scheduleRaw) : "",
    facility: departure ? first(raw, ["GATE", "gate"], "-") : "-",
    facilityLabel: departure ? "탑승구" : "수하물",
    flightType: normalizeType(first(raw, ["LINE", "line"])),
    remark,
    remarkEnglish: first(raw, ["RMK_ENG", "rmkEng"]),
    codeshare: first(raw, ["CDSR_YN", "codeshare"]),
  };
}

function sortEpoch(value: string) {
  return Number(value.replace(/\D/g, "").slice(0, 12)) || Number.MAX_SAFE_INTEGER;
}

function cleanApiKey(value: string) {
  const trimmed = value.trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function getApiKey() {
  const configuredKey = process.env.KAC_API_KEY;
  if (!configuredKey?.trim()) throw new Error("KAC_API_KEY가 설정되지 않았습니다.");
  return cleanApiKey(configuredKey);
}

function safeUpstreamMessage(value: string, apiKey: string) {
  return value.replaceAll(apiKey, "<redacted>").replace(/\s+/g, " ").slice(0, 220);
}

function gwPage(json: any): GwPage {
  const serviceError = json?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (serviceError) {
    throw new Error(
      `KAC 통합 운항 API 오류 ${text(serviceError?.returnReasonCode, "unknown")}: ${text(
        serviceError?.returnAuthMsg ?? serviceError?.errMsg,
        "알 수 없는 오류"
      )}`
    );
  }

  const response = json?.response ?? json;
  const header = response?.header ?? json?.header;
  const resultCode = text(header?.resultCode);
  if (resultCode && resultCode !== "00" && resultCode !== "0000") {
    throw new Error(`KAC 통합 운항 API 오류 ${resultCode}: ${text(header?.resultMsg, "알 수 없는 오류")}`);
  }

  const body = response?.body ?? json?.body ?? json;
  const value = body?.items?.item ?? body?.items ?? json?.items?.item ?? json?.items ?? [];
  const items = Array.isArray(value)
    ? (value as RawKacFlight[])
    : value && typeof value === "object"
      ? [value as RawKacFlight]
      : [];
  const totalCount = Number(text(body?.totalCount, String(items.length))) || items.length;
  return { items, totalCount };
}

async function fetchGw(path: string, params: Record<string, string>, revalidate: number): Promise<GwPage> {
  const apiKey = getApiKey();
  const endpoint = new URL(`${KAC_GW_BASE}/${path}`);
  endpoint.searchParams.set("serviceKey", apiKey);
  Object.entries(params).forEach(([key, value]) => endpoint.searchParams.set(key, value));
  endpoint.searchParams.set("type", "json");

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`KAC 통합 운항 API ${response.status}: ${safeUpstreamMessage(responseBody, apiKey)}`);
  }

  let json: any;
  try {
    json = JSON.parse(responseBody);
  } catch {
    throw new Error(`KAC 통합 운항 API가 JSON이 아닌 응답을 반환했습니다: ${safeUpstreamMessage(responseBody, apiKey)}`);
  }

  return gwPage(json);
}

async function fetchGwInfoFlights(mode: FlightMode, date: string) {
  const expectedIo = mode === "departures" ? "O" : "I";
  const { items } = await fetchGw(
    "info",
    {
      schAirCode: AIRPORT_CODE,
      schIOType: expectedIo,
      schStTime: "0000",
      schEdTime: "2359",
      pageNo: "1",
      numOfRows: "100",
    },
    INFO_REVALIDATE_SECONDS
  );

  return items
    .filter((raw) => {
      const io = first(raw, ["io", "IO"]).toUpperCase();
      const airport = first(raw, ["airport", "AIRPORT"]).toUpperCase();
      return (!io || io === expectedIo) && (!airport || airport === AIRPORT_CODE);
    })
    .map((raw, index) => normalizeGwInfoFlight(raw, mode, index, date))
    .filter((flight) => flight.flightId !== "-" && flight.scheduleDateTime)
    .sort((a, b) => sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) || a.flightId.localeCompare(b.flightId));
}

async function fetchGwOperationFlights(mode: FlightMode, date: string) {
  const path = mode === "departures" ? "depart" : "arrival";
  const { items } = await fetchGw(
    path,
    {
      pageNo: "1",
      numOfRows: "100",
      searchday: date,
      from_time: "0000",
      to_time: "2359",
      airport_code: AIRPORT_CODE,
    },
    OPERATION_REVALIDATE_SECONDS
  );

  const expectedIo = mode === "departures" ? "O" : "I";
  return items
    .filter((raw) => {
      const io = first(raw, ["io"]).toUpperCase();
      const searchDay = first(raw, ["searchday"], date).replace(/\D/g, "").slice(0, 8);
      return (!io || io === expectedIo) && (!searchDay || searchDay === date);
    })
    .map((raw, index) => normalizeGwOperationFlight(raw, mode, index, date))
    .filter((flight) => flight.flightId !== "-" && flight.scheduleDateTime)
    .sort((a, b) => sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) || a.flightId.localeCompare(b.flightId));
}

function operationFallbackKey(flight: FidsFlight) {
  return [
    flight.mode,
    normalizedFlightId(flight.flightId),
    flight.scheduleDateTime,
    flight.airportCode,
  ].join("|");
}

function mergeOperationFlights(baseFlights: FidsFlight[], operationFlights: FidsFlight[]) {
  const operationById = new Map(operationFlights.map((flight) => [normalizedFlightId(flight.flightId), flight]));
  const merged: FidsFlight[] = baseFlights.map((flight) => {
    const meta = operationById.get(normalizedFlightId(flight.flightId));
    if (!meta) return flight;
    return {
      ...meta,
      ...flight,
      masterFlightId: meta.masterFlightId || flight.masterFlightId,
      codeshare: meta.codeshare || flight.codeshare,
      airline: flight.airline === "-" ? meta.airline : flight.airline,
      airport: flight.airport === "-" ? meta.airport : flight.airport,
      airportEnglish: flight.airportEnglish || meta.airportEnglish,
      airportCode: flight.airportCode || meta.airportCode,
      remark: flight.remark || meta.remark,
      actualDateTime: flight.actualDateTime || meta.actualDateTime,
      facility: flight.facility || meta.facility || "-",
    };
  });

  const existingKeys = new Set(merged.map(operationFallbackKey));
  operationFlights.forEach((flight) => {
    const key = operationFallbackKey(flight);
    if (existingKeys.has(key)) return;
    merged.push(flight);
    existingKeys.add(key);
  });

  const byFlightId = new Map(merged.map((flight) => [normalizedFlightId(flight.flightId), flight]));
  const masterIds = new Set(
    merged.map((flight) => normalizedFlightId(flight.masterFlightId)).filter(Boolean)
  );

  masterIds.forEach((masterId) => {
    const master = byFlightId.get(masterId);
    if (master) master.masterFlightId = masterId;
  });

  merged.forEach((flight) => {
    const masterId = normalizedFlightId(flight.masterFlightId);
    if (!masterId) return;
    const master = byFlightId.get(masterId);
    if (!master || master === flight) return;

    flight.scheduleDateTime = master.scheduleDateTime || flight.scheduleDateTime;
    flight.estimatedDateTime = master.estimatedDateTime || flight.estimatedDateTime;
    flight.actualDateTime = master.actualDateTime || flight.actualDateTime;
    flight.airport = master.airport || flight.airport;
    flight.airportEnglish = master.airportEnglish || flight.airportEnglish;
    flight.airportCode = master.airportCode || flight.airportCode;
    flight.flightType = master.flightType;
    flight.facility = master.facility || flight.facility;
    flight.remark = master.remark || flight.remark;
    flight.remarkEnglish = master.remarkEnglish || flight.remarkEnglish;
  });

  return merged.sort(
    (a, b) =>
      sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) ||
      normalizedFlightId(a.masterFlightId || a.flightId).localeCompare(normalizedFlightId(b.masterFlightId || b.flightId)) ||
      a.flightId.localeCompare(b.flightId)
  );
}

async function fetchGwDetailPage(pageNo: number): Promise<GwPage> {
  return fetchGw(
    "detail",
    {
      pageNo: String(pageNo),
      numOfRows: String(DETAIL_PAGE_SIZE),
    },
    DETAIL_REVALIDATE_SECONDS
  );
}

function detailPageRange(items: RawKacFlight[]) {
  const times = items
    .map((raw) => hhmmMinutes(first(raw, ["STD", "std"])))
    .filter(Number.isFinite);
  if (!times.length) return null;
  return { min: Math.min(...times), max: Math.max(...times) };
}

function detailFlightKey(date: string, mode: FlightMode, flightId: string, schedule: string) {
  return `${date}|${mode === "departures" ? "O" : "I"}|${normalizedFlightId(flightId)}|${hhmm(schedule)}`;
}

function shouldEnrichFacility(flight: FidsFlight, now = Date.now()) {
  if (flight.facility && flight.facility !== "-") return false;
  const epoch = dateTimeEpoch(flight.estimatedDateTime || flight.scheduleDateTime);
  if (!Number.isFinite(epoch)) return false;
  return epoch >= now - DETAIL_LOOKBACK_MS && epoch <= now + DETAIL_LOOKAHEAD_MS;
}

async function fetchRelevantDetailRows(flights: FidsFlight[]) {
  const targets = flights.filter((flight) => shouldEnrichFacility(flight));
  if (!targets.length) return [] as RawKacFlight[];

  const targetMinutes = [...new Set(
    targets
      .map((flight) => hhmmMinutes(flight.scheduleDateTime))
      .filter(Number.isFinite)
  )];
  if (!targetMinutes.length) return [] as RawKacFlight[];

  const pages = new Map<number, Promise<GwPage>>();
  const getPage = (pageNo: number) => {
    const safePage = Math.max(1, pageNo);
    let promise = pages.get(safePage);
    if (!promise) {
      promise = fetchGwDetailPage(safePage);
      pages.set(safePage, promise);
    }
    return promise;
  };

  const firstPage = await getPage(1);
  const totalPages = Math.max(1, Math.ceil(firstPage.totalCount / DETAIL_PAGE_SIZE));
  const candidatePages = new Set<number>();

  for (const target of targetMinutes) {
    let low = 1;
    let high = totalPages;
    let found = 1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const page = await getPage(middle);
      const range = detailPageRange(page.items);
      if (!range) {
        found = middle;
        break;
      }
      if (target < range.min) {
        found = middle;
        high = middle - 1;
      } else if (target > range.max) {
        found = middle;
        low = middle + 1;
      } else {
        found = middle;
        break;
      }
    }

    for (const pageNo of [found - 1, found, found + 1]) {
      if (pageNo >= 1 && pageNo <= totalPages) candidatePages.add(pageNo);
    }
  }

  const detailPages = await Promise.all([...candidatePages].map((pageNo) => getPage(pageNo)));
  return detailPages.flatMap((page) => page.items);
}

async function enrichFacilities(flights: FidsFlight[], date: string, mode: FlightMode) {
  const detailRows = await fetchRelevantDetailRows(flights);
  if (!detailRows.length) return { flights, usedDetail: false };

  const exact = new Map<string, RawKacFlight>();
  const loose = new Map<string, RawKacFlight>();

  detailRows.forEach((raw) => {
    const airport = first(raw, ["AIRPORT", "airport"]).toUpperCase();
    const flightDate = first(raw, ["FLIGHT_DATE", "flightDate"]).replace(/\D/g, "").slice(0, 8);
    const io = first(raw, ["IO", "io"]).toUpperCase();
    const flightId = normalizedFlightId(first(raw, ["AIR_FLN", "airFln"]));
    const schedule = first(raw, ["STD", "std"]);
    if (airport !== AIRPORT_CODE || flightDate !== date || !flightId) return;
    if (io && io !== (mode === "departures" ? "O" : "I")) return;

    exact.set(detailFlightKey(flightDate, mode, flightId, schedule), raw);
    loose.set(`${flightDate}|${io || (mode === "departures" ? "O" : "I")}|${flightId}`, raw);
  });

  const enriched = flights.map((flight) => {
    if (!shouldEnrichFacility(flight)) return flight;
    const flightDate = flight.scheduleDateTime.slice(0, 8) || date;
    const io = mode === "departures" ? "O" : "I";
    const detail =
      exact.get(detailFlightKey(flightDate, mode, flight.flightId, flight.scheduleDateTime)) ||
      loose.get(`${flightDate}|${io}|${normalizedFlightId(flight.flightId)}`);
    if (!detail) return flight;

    const facility =
      mode === "departures"
        ? first(detail, ["GATE", "gate"], flight.facility)
        : first(detail, ["BAGGAGE_CLAIM", "baggageClaim"], flight.facility);
    return facility && facility !== flight.facility ? { ...flight, facility } : flight;
  });

  return { flights: enriched, usedDetail: true };
}

async function fetchHomepageFlights(mode: FlightMode, date: string, formDate: string) {
  const endpoint = process.env.KAC_HOMEPAGE_API_URL?.trim() || HOMEPAGE_ENDPOINT;
  const body = new URLSearchParams({
    pInoutGbn: mode === "departures" ? "O" : "I",
    pAirport: AIRPORT_CODE,
    pGbn: "",
    pActDate: formDate,
    pSthourMin: "00:00",
    pEnhourMin: "23:59",
    pCity: "",
    pAirline: "",
    pAirlinenum: "",
    p0: "",
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://www.airport.co.kr",
      Referer: REFERER,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const responseBody = await response.text();
  if (!response.ok) throw new Error(`대구공항 홈페이지 ${response.status}: ${responseBody.slice(0, 180)}`);

  let json: any;
  try {
    json = JSON.parse(responseBody);
  } catch {
    const contentType = response.headers.get("content-type") || "unknown";
    throw new Error(`대구공항 홈페이지가 JSON이 아닌 응답을 반환했습니다. (${contentType}: ${responseBody.replace(/\s+/g, " ").slice(0, 100)})`);
  }

  const items = Array.isArray(json?.data?.list) ? (json.data.list as RawKacFlight[]) : [];
  return items
    .filter((raw) => {
      const io = first(raw, ["IO", "io"]).toUpperCase();
      return !io || io === (mode === "departures" ? "O" : "I");
    })
    .map((raw, index) => normalizeHomepageFlight(raw, mode, index, date))
    .filter((flight) => flight.flightId !== "-" && flight.scheduleDateTime)
    .sort((a, b) => sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) || a.flightId.localeCompare(b.flightId));
}

function payload(
  mode: FlightMode,
  flights: FidsFlight[],
  source: FlightsPayload["source"],
  warning?: string,
  dataSources?: string[]
): FlightsPayload {
  const { date } = kstParts();
  return {
    flights,
    mode,
    updatedAt: new Date().toISOString(),
    source,
    dataSources:
      dataSources ??
      (source === "kac_gw"
        ? ["kac-flight-status-info-gw"]
        : source === "kac_homepage"
          ? ["kac-daegu-homepage"]
          : ["demo"]),
    query: {
      airport: AIRPORT_CODE,
      date,
    },
    warning,
  };
}

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode: FlightMode = modeParam === "arrivals" ? "arrivals" : "departures";
  const { date, formDate } = kstParts();

  if (process.env.FIDS_DEMO_MODE === "true") {
    return NextResponse.json(payload(mode, demoFlights(mode), "demo", "FIDS_DEMO_MODE가 활성화되어 데모 운항편을 표시합니다."));
  }

  const liveErrors: string[] = [];

  try {
    let flights = await fetchGwInfoFlights(mode, date);
    const dataSources = ["kac-flight-status-info-gw"];

    try {
      const operationFlights = await fetchGwOperationFlights(mode, date);
      flights = mergeOperationFlights(flights, operationFlights);
      dataSources.push(mode === "departures" ? "kac-flight-status-depart-gw" : "kac-flight-status-arrival-gw");
    } catch (error) {
      console.warn("[TAE FIDS] 코드쉐어 보강 조회 실패", error);
    }

    try {
      const facilityResult = await enrichFacilities(flights, date, mode);
      flights = facilityResult.flights;
      if (facilityResult.usedDetail) dataSources.push("kac-flight-status-detail-gw");
    } catch (error) {
      console.warn("[TAE FIDS] 시설정보 보강 조회 실패", error);
    }

    return NextResponse.json(payload(mode, flights, "kac_gw", undefined, dataSources), {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30` },
    });
  } catch (error) {
    liveErrors.push(error instanceof Error ? error.message : "KAC GW Unknown error");
  }

  try {
    const flights = await fetchHomepageFlights(mode, date, formDate);
    if (!flights.length) throw new Error("대구공항 홈페이지 운항편이 0건으로 반환되었습니다.");
    return NextResponse.json(payload(mode, flights, "kac_homepage", liveErrors[0]), {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30` },
    });
  } catch (error) {
    liveErrors.push(error instanceof Error ? error.message : "Homepage Unknown error");
    console.error("[TAE FIDS] 대구공항 실시간 목록 조회 실패", liveErrors.join(" / "));
    return NextResponse.json(
      payload(mode, demoFlights(mode), "demo", `실시간 연결 실패: ${liveErrors.join(" / ")}`),
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
