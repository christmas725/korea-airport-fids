import { NextRequest, NextResponse } from "next/server";
import { demoFlights } from "@/lib/tae/demo";
import type { FidsFlight, FlightMode, FlightsPayload, RawKacFlight } from "@/lib/tae/types";
import { airportByCode } from "@/lib/airports";
import {
  isOvernightYActiveFlight,
  isOvernightYFlightId,
  isWithinCompletedFlightGrace,
} from "@/lib/fids/visibility";
import { previewTestAllowed, readPreviewTest, testBaseDate } from "@/lib/fids/previewTest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

const KAC_GW_BASE = "https://apis.data.go.kr/B551178/flight-status";
const KAC_SITE_SLUGS: Record<string, string> = {
  GMP: "gimpo",
  PUS: "gimhae",
  CJU: "jeju",
  TAE: "daegu",
  CJJ: "cheongju",
  MWX: "muan",
  KWJ: "gwangju",
  RSU: "yeosu",
  USN: "ulsan",
  KPO: "pohang",
  HIN: "sacheon",
  KUV: "gunsan",
  WJU: "wonju",
  YNY: "yangyang",
};

const CACHE_SECONDS = 45;
const REQUEST_TIMEOUT_MS = 10_000;
const INFO_REVALIDATE_SECONDS = 45;
const OPERATION_REVALIDATE_SECONDS = 300;
const DETAIL_REVALIDATE_SECONDS = 600;
const FLIGHT_PAGE_SIZE = 100;
const FLIGHT_PAGE_CONCURRENCY = 2;
const MAX_FLIGHT_PAGES = 20;
const DETAIL_PAGE_SIZE = 100;
const DETAIL_LOOKBACK_MS = 3 * 60 * 60_000;
const DETAIL_LOOKAHEAD_MS = 4 * 60 * 60_000;
const GATE_HISTORY_ENDPOINT = "https://kfcnzzcjjndmexzrmcrd.supabase.co/functions/v1/kac-gate-history";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_w_SIAqFa0yNUBg5YcFUidg_hmo6-TaI";

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

const PREVIOUS_GATE_KEYS = [
  "prevGate", "previousGate", "oldGate", "beforeGate", "orgGate",
  "PREV_GATE", "PREVIOUS_GATE", "OLD_GATE", "BEFORE_GATE", "ORG_GATE", "GATE_BEFORE",
];

function previousGate(raw: RawKacFlight) {
  return first(raw, PREVIOUS_GATE_KEYS);
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

function kstMinuteOfDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return read("hour") * 60 + read("minute");
}

function formDateFromCompact(date: string) {
  return /^d{8}$/.test(date)
    ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
    : "";
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
    previousFacility: departure ? previousGate(raw) : "",
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
    previousFacility: departure ? previousGate(raw) : "",
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
    previousFacility: departure ? previousGate(raw) : "",
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

async function fetchAllGwPages(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<GwPage> {
  const fetchPage = (pageNo: number) =>
    fetchGw(
      path,
      {
        ...params,
        pageNo: String(pageNo),
        numOfRows: String(FLIGHT_PAGE_SIZE),
      },
      revalidate
    );

  const firstPage = await fetchPage(1);
  const totalPages = Math.min(
    MAX_FLIGHT_PAGES,
    Math.max(1, Math.ceil(firstPage.totalCount / FLIGHT_PAGE_SIZE))
  );
  const items = [...firstPage.items];

  for (let start = 2; start <= totalPages; start += FLIGHT_PAGE_CONCURRENCY) {
    const pageNumbers = Array.from(
      { length: Math.min(FLIGHT_PAGE_CONCURRENCY, totalPages - start + 1) },
      (_, index) => start + index
    );
    const pages = await Promise.all(pageNumbers.map(fetchPage));
    pages.forEach((page) => items.push(...page.items));
  }

  return { items, totalCount: firstPage.totalCount };
}

async function fetchGwInfoFlights(airportCode: string, mode: FlightMode, date: string) {
  const expectedIo = mode === "departures" ? "O" : "I";
  const { items } = await fetchAllGwPages(
    "info",
    {
      schAirCode: airportCode,
      schIOType: expectedIo,
      schStTime: "0000",
      schEdTime: "2359",
    },
    INFO_REVALIDATE_SECONDS
  );

  return items
    .filter((raw) => {
      const io = first(raw, ["io", "IO"]).toUpperCase();
      const airport = first(raw, ["airport", "AIRPORT"]).toUpperCase();
      return (!io || io === expectedIo) && (!airport || airport === airportCode);
    })
    .map((raw, index) => normalizeGwInfoFlight(raw, mode, index, date))
    .filter((flight) => flight.flightId !== "-" && flight.scheduleDateTime)
    .sort((a, b) => sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) || a.flightId.localeCompare(b.flightId));
}

async function fetchGwOperationFlights(airportCode: string, mode: FlightMode, date: string) {
  const path = mode === "departures" ? "depart" : "arrival";
  const { items } = await fetchAllGwPages(
    path,
    {
      searchday: date,
      from_time: "0000",
      to_time: "2359",
      airport_code: airportCode,
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
      previousFacility: flight.previousFacility || meta.previousFacility,
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
    flight.previousFacility = master.previousFacility || flight.previousFacility;
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


function homepageSupplementKey(flight: FidsFlight) {
  return [
    flight.mode,
    normalizedFlightId(flight.flightId),
    flight.scheduleDateTime.replace(/\D/g, "").slice(0, 12),
  ].join("|");
}

/**
 * KAC GW가 일부 편을 누락하더라도 공식 공항 홈페이지에 남아 있는 당일 운항편은
 * 보조 소스로 추가한다. 동일 편은 GW 값을 우선하되, 비어 있는 필드는 홈페이지 값으로
 * 보충해 API 한도 초과나 부분 응답에서도 게이트와 목적지 정보가 사라지지 않게 한다.
 */
function mergeHomepageSupplement(baseFlights: FidsFlight[], homepageFlights: FidsFlight[]) {
  const result = [...baseFlights];
  const indexes = new Map(result.map((flight, index) => [homepageSupplementKey(flight), index]));
  function preferValue(primary: string, fallback: string): string;
  function preferValue(
    primary: string | undefined,
    fallback: string | undefined
  ): string | undefined;
  function preferValue(primary: string | undefined, fallback: string | undefined) {
    const value = (primary ?? "").trim();
    return value && value !== "-" ? primary : fallback;
  }

  for (const flight of homepageFlights) {
    const key = homepageSupplementKey(flight);
    const existingIndex = indexes.get(key);
    if (existingIndex === undefined) {
      indexes.set(key, result.length);
      result.push(flight);
      continue;
    }

    const existing = result[existingIndex];
    result[existingIndex] = {
      ...existing,
      masterFlightId: preferValue(existing.masterFlightId, flight.masterFlightId),
      airline: preferValue(existing.airline, flight.airline),
      airlineEnglish: preferValue(existing.airlineEnglish, flight.airlineEnglish),
      airport: preferValue(existing.airport, flight.airport),
      airportEnglish: preferValue(existing.airportEnglish, flight.airportEnglish),
      airportCode: preferValue(existing.airportCode, flight.airportCode),
      estimatedDateTime: preferValue(existing.estimatedDateTime, flight.estimatedDateTime),
      actualDateTime: preferValue(existing.actualDateTime, flight.actualDateTime),
      facility: validGate(existing.facility) || validGate(flight.facility) || "-",
      previousFacility:
        validGate(existing.previousFacility) || validGate(flight.previousFacility),
      flightType: existing.flightType,
      remark: preferValue(existing.remark, flight.remark),
      remarkEnglish: preferValue(existing.remarkEnglish, flight.remarkEnglish),
      codeshare: preferValue(existing.codeshare, flight.codeshare),
    };
  }

  return result.sort(
    (a, b) =>
      sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) ||
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

async function enrichFacilities(flights: FidsFlight[], date: string, mode: FlightMode, airportCode: string) {
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
    if (airport !== airportCode || flightDate !== date || !flightId) return;
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
    const previousFacility =
      mode === "departures"
        ? previousGate(detail) || flight.previousFacility
        : flight.previousFacility;

    if (facility !== flight.facility || previousFacility !== flight.previousFacility) {
      return { ...flight, facility, previousFacility };
    }
    return flight;
  });

  return { flights: enriched, usedDetail: true };
}


type GateHistoryRow = {
  flight_key?: string;
  previous_gate?: string | null;
  current_gate?: string | null;
};

function isoOperationDate(date: string) {
  const digits = date.replace(/\D/g, "").slice(0, 8);
  return digits.length === 8
    ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
    : "";
}

function validGate(value: string | null | undefined) {
  const gate = (value ?? "").trim();
  return gate && gate !== "-" && !/^N\/?A$/i.test(gate) ? gate : "";
}

async function enrichGateHistory(
  flights: FidsFlight[],
  date: string,
  mode: FlightMode,
  airportCode: string
) {
  if (mode !== "departures" || !flights.length) {
    return { flights, usedHistory: false };
  }

  const operationDate = isoOperationDate(date);
  if (!operationDate) return { flights, usedHistory: false };

  const endpoint = new URL(GATE_HISTORY_ENDPOINT);
  endpoint.searchParams.set("airport", airportCode);
  endpoint.searchParams.set("date", operationDate);

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    next: { revalidate: 15 },
    signal: AbortSignal.timeout(3_000),
  });

  if (!response.ok) {
    throw new Error(`게이트 이력 조회 실패 ${response.status}`);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.gates) ? (json.gates as GateHistoryRow[]) : [];
  if (!rows.length) return { flights, usedHistory: true };

  const history = new Map(
    rows
      .map((row) => [normalizedFlightId(row.flight_key ?? ""), row] as const)
      .filter(([key]) => Boolean(key))
  );

  return {
    usedHistory: true,
    flights: flights.map((flight) => {
      if (validGate(flight.previousFacility)) return flight;

      const key = normalizedFlightId(flight.masterFlightId || flight.flightId);
      const row = history.get(key);
      if (!row) return flight;

      const current = validGate(row.current_gate);
      const previous = validGate(row.previous_gate);
      const displayedCurrent = validGate(flight.facility);

      if (!previous || !current || previous === current || current !== displayedCurrent) {
        return flight;
      }

      return { ...flight, previousFacility: previous };
    }),
  };
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value
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

function htmlCellText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function homepageCell(row: string, className: string) {
  const pattern = new RegExp(
    `<li\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/li>`,
    "i"
  );
  return htmlCellText(row.match(pattern)?.[1] ?? "");
}

function parseKacHomepageHtml(
  html: string,
  _airportCode: string,
  mode: FlightMode,
  date: string
) {
  const flights: FidsFlight[] = [];
  const rowPattern = new RegExp(
    "<ul\\b[^>]*class=[\"'][^\"']*\\bflight-stat-info\\b[^\"']*[\"'][^>]*>([\\s\\S]*?)</ul>",
    "gi"
  );
  const timePattern = new RegExp("([0-2]\\d):([0-5]\\d)", "g");
  const flightPattern = new RegExp("([A-Z0-9]{2}\\s*\\d{1,4}[A-Z]?)", "i");

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = rowPattern.exec(html)) !== null) {
    const body = match[1] ?? "";
    const timeText = homepageCell(body, "fligt-time");
    const times = timeText.match(timePattern) ?? [];
    if (!times.length) continue;

    const nameText = homepageCell(body, "fligt-name");
    const flightMatch = nameText.match(flightPattern);
    if (!flightMatch) continue;

    const flightIdText = flightMatch[1];
    if (!flightIdText) continue;
    const flightId = normalizedFlightId(flightIdText);
    const matchedFlightText = flightMatch[0] || flightIdText;
    const airline =
      nameText.replace(matchedFlightText, "").replace(/항공편|편명/gi, "").trim() || "-";

    const estimatedRaw = times[0]!.replace(":", "");
    const scheduleRaw = (times.length > 1 ? times[times.length - 1]! : times[0]!).replace(":", "");
    const scheduleDateTime = fullDateTime(scheduleRaw, date);
    const estimatedDateTime =
      fullDateTime(estimatedRaw, date, scheduleRaw) || scheduleDateTime;

    const airport =
      homepageCell(body, "fligt-dest").replace(/목적지|출발지/gi, "").trim() || "-";
    const flightTypeText = homepageCell(body, "fligt-div");
    const facility =
      homepageCell(body, "fligt-out").replace(/탑승구|수하물/gi, "").trim() || "-";
    const rawRemark = homepageCell(body, "fligt-stat").trim();
    const remark = rawRemark === "-" ? "" : rawRemark;

    flights.push({
      id: "homepage-" + date + "-" + mode + "-" + flightId + "-" + index++,
      mode,
      flightId,
      masterFlightId: "",
      airline,
      airlineEnglish: "",
      airport,
      airportEnglish: "",
      airportCode: "",
      scheduleDateTime,
      estimatedDateTime,
      actualDateTime: isCompleteStatus(remark) ? estimatedDateTime : "",
      facility,
      previousFacility: "",
      facilityLabel: mode === "departures" ? "탑승구" : "수하물",
      flightType: normalizeType(flightTypeText),
      remark,
      remarkEnglish: "",
      codeshare: "",
    });
  }

  return flights.sort(
    (a, b) =>
      sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) ||
      a.flightId.localeCompare(b.flightId)
  );
}

function decodeHomepageHtml(input: string) {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => entities[name.toLowerCase()] ?? all);
}

function homepageCellText(html: string) {
  return decodeHomepageHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function parseKacHomepageFlights(
  html: string,
  airportCode: string,
  mode: FlightMode,
  date: string
) {
  const wantedIo = mode === "departures" ? "O" : "I";
  const flights: FidsFlight[] = [];
  const rowPattern =
    /<tr\b[^>]*class=["'][^"']*((?:\d{8})?_(?:[OI])_[A-Z0-9]{3}_[A-Z0-9]{2}_[A-Z0-9]+)[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = rowPattern.exec(html)) !== null) {
    const rowClass = match[1] ?? "";
    const rowHtml = match[2] ?? "";
    const keyMatch = rowClass.match(/^(?:(\d{8}))?_([OI])_([A-Z0-9]{3})_([A-Z0-9]{2})_([A-Z0-9]+)$/i);
    if (!keyMatch) continue;

    const operationDate = keyMatch[1] || date;
    const io = keyMatch[2].toUpperCase();
    const rowAirport = keyMatch[3].toUpperCase();
    const airlineCode = keyMatch[4].toUpperCase();
    const flightNumber = keyMatch[5].toUpperCase();
    if (io !== wantedIo || rowAirport !== airportCode.toUpperCase()) continue;

    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cells.length < 6) continue;

    const timeCell = cells[0]?.[1] ?? "";
    const scheduleText =
      timeCell.match(/class=["'][^"']*\bico_time\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "";
    const changedText =
      timeCell.match(/class=["'][^"']*\btime_change\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "";

    const scheduleMatch = homepageCellText(scheduleText).match(/([0-2]\d):([0-5]\d)/);
    const changedMatch = homepageCellText(changedText).match(/([0-2]\d):([0-5]\d)/);
    if (!scheduleMatch) continue;

    const scheduleRaw = scheduleMatch[1] + scheduleMatch[2];
    const estimatedRaw = changedMatch
      ? changedMatch[1] + changedMatch[2]
      : scheduleRaw;

    const scheduleDateTime = fullDateTime(scheduleRaw, operationDate);
    const estimatedDateTime =
      fullDateTime(estimatedRaw, operationDate, scheduleRaw) || scheduleDateTime;

    const flightId = (airlineCode + flightNumber).toUpperCase();
    const airlineFlight = homepageCellText(cells[1]?.[1] ?? "");
    const airline = airlineFlight.replace(flightId, "").trim() || "-";
    const airport = homepageCellText(cells[2]?.[1] ?? "") || "-";
    const flightTypeText = homepageCellText(cells[3]?.[1] ?? "");
    const facility = homepageCellText(cells[4]?.[1] ?? "") || "-";
    const remarkText = homepageCellText(cells[5]?.[1] ?? "");
    const remark = remarkText === "-" ? "" : remarkText;

    flights.push({
      id: "homepage-" + operationDate + "-" + mode + "-" + flightId + "-" + index++,
      mode,
      flightId,
      masterFlightId: "",
      airline,
      airlineEnglish: "",
      airport,
      airportEnglish: "",
      airportCode: "",
      scheduleDateTime,
      estimatedDateTime,
      actualDateTime: isCompleteStatus(remark) ? estimatedDateTime : "",
      facility,
      previousFacility: "",
      facilityLabel: mode === "departures" ? "탑승구" : "수하물",
      flightType: normalizeType(flightTypeText),
      remark,
      remarkEnglish: "",
      codeshare: "",
    });
  }

  return flights.sort(
    (a, b) =>
      sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) ||
      a.flightId.localeCompare(b.flightId)
  );
}

async function fetchHomepageFlights(airportCode: string, mode: FlightMode, date: string, formDate: string) {
  const slug = KAC_SITE_SLUGS[airportCode.toUpperCase()];
  if (!slug) throw new Error("KAC 홈페이지 경로를 알 수 없는 공항입니다: " + airportCode);

  const pageUrl =
    "https://www.airport.co.kr/" +
    slug +
    "/cms/frCon/index.do?MENU_ID=100&CONTENTS_NO=" +
    (mode === "departures" ? "1" : "2");
  const apiUrl =
    "https://www.airport.co.kr/" + slug + "/ajaxf/frPryInfoSvc/getPryInfoList.do";
  const body = new URLSearchParams({
    pInoutGbn: mode === "departures" ? "O" : "I",
    pAirport: airportCode,
    pGbn: "",
    pActDate: formDate,
    pSthourMin: "00:00",
    pEnhourMin: "23:59",
    pCity: "",
    pAirline: "",
    pAirlinenum: "",
    p0: "",
  });

  const browserHeaders = {
    Accept: "application/json,text/javascript,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  };

  const sessionResponse = await fetch(pageUrl, {
    headers: { ...browserHeaders, Accept: "text/html,application/xhtml+xml" },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const setCookie = sessionResponse.headers.get("set-cookie") ?? "";
  const cookieHeader = setCookie
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...browserHeaders,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://www.airport.co.kr",
      Referer: pageUrl,
      "X-Requested-With": "XMLHttpRequest",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(
      airportCode + "공항 홈페이지 운항 API " + response.status + ": " +
      responseBody.replace(/\s+/g, " ").slice(0, 180)
    );
  }

  let json: any;
  try {
    json = JSON.parse(responseBody);
  } catch {
    return parseKacHomepageHtml(responseBody, airportCode, mode, date);
  }

  const candidates = [
    json?.FR_PRY_INFO_LIST,
    json?.data?.FR_PRY_INFO_LIST,
    json?.result?.FR_PRY_INFO_LIST,
    json?.list,
    json?.data?.list,
  ];
  const items = candidates.find((value) => Array.isArray(value)) as RawKacFlight[] | undefined;
  if (!items?.length) return [];

  return items
    .map((raw, index) => normalizeHomepageFlight(raw, mode, index, date))
    .filter((flight) => flight.flightId !== "-" && flight.scheduleDateTime)
    .sort(
      (a, b) =>
        sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) ||
        a.flightId.localeCompare(b.flightId)
    );
}

function payload(
  airportCode: string,
  mode: FlightMode,
  flights: FidsFlight[],
  source: FlightsPayload["source"],
  warning?: string,
  dataSources?: string[]
): FlightsPayload {
  const { date } = kstParts();
  return {
    flights: source === "demo" ? flights : flights.filter((flight) => isWithinCompletedFlightGrace(flight)),
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
      airport: airportCode,
      date,
    },
    warning,
  };
}

function mergeOvernightYFlights(
  baseFlights: FidsFlight[],
  previousDayFlights: FidsFlight[]
) {
  const result = [...baseFlights];
  const indexByFlightId = new Map(
    result.map((flight, index) => [normalizedFlightId(flight.flightId), index] as const)
  );

  for (const previousDay of previousDayFlights) {
    if (!isOvernightYFlightId(previousDay.flightId)) continue;

    const key = normalizedFlightId(previousDay.flightId);
    const existingIndex = indexByFlightId.get(key);
    if (existingIndex === undefined) {
      if (
        isOvernightYActiveFlight(previousDay) &&
        isWithinCompletedFlightGrace(previousDay)
      ) {
        indexByFlightId.set(key, result.length);
        result.push(previousDay);
      }
      continue;
    }

    const current = result[existingIndex]!;
    result[existingIndex] = {
      ...previousDay,
      ...current,
      scheduleDateTime: previousDay.scheduleDateTime || current.scheduleDateTime,
      estimatedDateTime: current.estimatedDateTime || previousDay.estimatedDateTime,
      actualDateTime: current.actualDateTime || previousDay.actualDateTime,
      facility: validGate(current.facility) || validGate(previousDay.facility) || "-",
      previousFacility:
        validGate(current.previousFacility) || validGate(previousDay.previousFacility),
      remark: current.remark || previousDay.remark,
      remarkEnglish: current.remarkEnglish || previousDay.remarkEnglish,
    };
  }

  return result.sort(
    (a, b) =>
      sortEpoch(a.scheduleDateTime) - sortEpoch(b.scheduleDateTime) ||
      a.flightId.localeCompare(b.flightId)
  );
}

async function loadOvernightYFlights(
  airportCode: string,
  mode: FlightMode,
  currentDate: string
) {
  if (mode !== "departures" || kstMinuteOfDay() >= 8 * 60) {
    return { flights: [] as FidsFlight[], dataSources: [] as string[] };
  }

  const previousDate = addDays(currentDate, -1);
  const previousFormDate = formDateFromCompact(previousDate);
  let flights: FidsFlight[] = [];
  const dataSources: string[] = [];

  try {
    flights = await fetchGwOperationFlights(airportCode, mode, previousDate);
    if (flights.length > 0) dataSources.push("kac-previous-day-depart-gw");
  } catch (error) {
    console.warn(
      `[${airportCode} FIDS] Y 익일 이월편 전날 운항 API 조회 실패`,
      error instanceof Error ? error.message : error
    );
  }

  if (previousFormDate && KAC_SITE_SLUGS[airportCode]) {
    try {
      const homepageFlights = await fetchHomepageFlights(
        airportCode,
        mode,
        previousDate,
        previousFormDate
      );
      if (homepageFlights.length > 0) {
        flights = flights.length > 0
          ? mergeHomepageSupplement(flights, homepageFlights)
          : homepageFlights;
        dataSources.push("kac-previous-day-homepage");
      }
    } catch (error) {
      console.warn(
        `[${airportCode} FIDS] Y 익일 이월편 전날 홈페이지 조회 실패`,
        error instanceof Error ? error.message : error
      );
    }
  }

  flights = flights.filter((flight) => isOvernightYFlightId(flight.flightId));
  if (!flights.length) return { flights, dataSources };

  try {
    const facilityResult = await enrichFacilities(flights, previousDate, mode, airportCode);
    flights = facilityResult.flights;
    if (facilityResult.usedDetail) dataSources.push("kac-previous-day-detail-gw");
  } catch (error) {
    console.warn(
      `[${airportCode} FIDS] Y 익일 이월편 시설정보 보강 실패`,
      error instanceof Error ? error.message : error
    );
  }

  try {
    const gateHistoryResult = await enrichGateHistory(
      flights,
      previousDate,
      mode,
      airportCode
    );
    flights = gateHistoryResult.flights;
    if (gateHistoryResult.usedHistory) dataSources.push("supabase-previous-day-gate-history");
  } catch (error) {
    console.warn(
      `[${airportCode} FIDS] Y 익일 이월편 게이트 이력 보강 실패`,
      error instanceof Error ? error.message : error
    );
  }

  return { flights, dataSources };
}

async function handleKacFlights(request: NextRequest, airportCode: string, airportName: string) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode: FlightMode = modeParam === "arrivals" ? "arrivals" : "departures";
  const { date, formDate } = kstParts();
  const previewTest = previewTestAllowed() ? readPreviewTest(request.nextUrl.searchParams) : null;

  if (previewTest) {
    const baseNow = testBaseDate(previewTest.time);
    const demo = demoFlights(mode, { scenario: previewTest.scenario, now: baseNow });
    return NextResponse.json(
      payload(
        airportCode,
        mode,
        demo,
        "demo",
        `Preview 테스트 시나리오: ${previewTest.scenario}`,
        [`preview-test:${previewTest.scenario}`]
      ),
      {
        headers: {
          "Cache-Control": "no-store",
          "X-FIDS-Test-Scenario": previewTest.scenario,
        },
      }
    );
  }

  if (process.env.FIDS_DEMO_MODE === "true") {
    const demo = airportCode === "TAE" ? demoFlights(mode) : [];
    return NextResponse.json(payload(airportCode, mode, demo, "demo", "FIDS_DEMO_MODE가 활성화되어 데모 운항편을 표시합니다."));
  }

  const liveErrors: string[] = [];

  try {
    let flights = await fetchGwInfoFlights(airportCode, mode, date);
    const dataSources = ["kac-flight-status-info-gw"];

    try {
      const operationFlights = await fetchGwOperationFlights(airportCode, mode, date);
      flights = mergeOperationFlights(flights, operationFlights);
      dataSources.push(mode === "departures" ? "kac-flight-status-depart-gw" : "kac-flight-status-arrival-gw");
    } catch (error) {
      console.warn(`[${airportCode} FIDS] 코드쉐어 보강 조회 실패`, error);
    }

    try {
      const homepageFlights = await fetchHomepageFlights(airportCode, mode, date, formDate);
      if (homepageFlights.length > 0) {
        const before = flights.length;
        flights = mergeHomepageSupplement(flights, homepageFlights);
        dataSources.push("kac-homepage-supplement");
        if (flights.length > before) {
          console.warn(
            `[${airportCode} FIDS] GW 누락 운항편 ${flights.length - before}건을 홈페이지에서 보강했습니다.`
          );
        }
      }
    } catch (error) {
      console.warn(
        `[${airportCode} FIDS] 홈페이지 보조 운항편 조회 실패`,
        error instanceof Error ? error.message : error
      );
    }

    try {
      const facilityResult = await enrichFacilities(flights, date, mode, airportCode);
      flights = facilityResult.flights;
      if (facilityResult.usedDetail) dataSources.push("kac-flight-status-detail-gw");
    } catch (error) {
      console.warn(`[${airportCode} FIDS] 시설정보 보강 조회 실패`, error);
    }

    try {
      const gateHistoryResult = await enrichGateHistory(flights, date, mode, airportCode);
      flights = gateHistoryResult.flights;
      if (gateHistoryResult.usedHistory) dataSources.push("supabase-gate-history");
    } catch (error) {
      console.warn(`[${airportCode} FIDS] 게이트 이력 보강 조회 실패`, error);
    }

    try {
      const overnight = await loadOvernightYFlights(airportCode, mode, date);
      if (overnight.flights.length > 0) {
        flights = mergeOvernightYFlights(flights, overnight.flights);
        dataSources.push(...overnight.dataSources);
      }
    } catch (error) {
      console.warn(
        `[${airportCode} FIDS] Y 익일 이월편 보강 실패`,
        error instanceof Error ? error.message : error
      );
    }

    return NextResponse.json(payload(airportCode, mode, flights, "kac_gw", undefined, dataSources), {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30` },
    });
  } catch (error) {
    liveErrors.push(error instanceof Error ? error.message : "KAC GW Unknown error");
  }

  if (KAC_SITE_SLUGS[airportCode]) {
    try {
      let flights = await fetchHomepageFlights(airportCode, mode, date, formDate);
      if (!flights.length) throw new Error(`${airportName}공항 홈페이지 운항편이 0건으로 반환되었습니다.`);

      const dataSources = ["kac-airport-homepage"];
      try {
        const gateHistoryResult = await enrichGateHistory(flights, date, mode, airportCode);
        flights = gateHistoryResult.flights;
        if (gateHistoryResult.usedHistory) dataSources.push("supabase-gate-history");
      } catch (error) {
        console.warn(`[${airportCode} FIDS] 홈페이지 fallback 게이트 이력 보강 조회 실패`, error);
      }

      try {
        const overnight = await loadOvernightYFlights(airportCode, mode, date);
        if (overnight.flights.length > 0) {
          flights = mergeOvernightYFlights(flights, overnight.flights);
          dataSources.push(...overnight.dataSources);
        }
      } catch (error) {
        console.warn(
          `[${airportCode} FIDS] 홈페이지 fallback Y 익일 이월편 보강 실패`,
          error instanceof Error ? error.message : error
        );
      }

      return NextResponse.json(
        payload(airportCode, mode, flights, "kac_homepage", liveErrors[0], dataSources),
        { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30` } },
      );
    } catch (error) {
      liveErrors.push(error instanceof Error ? error.message : "Homepage Unknown error");
    }
  }

  console.error(`[${airportCode} FIDS] ${airportName}공항 실시간 목록 조회 실패`, liveErrors.join(" / "));
  return NextResponse.json(
    payload(
      airportCode,
      mode,
      airportCode === "TAE" ? demoFlights(mode) : [],
      "demo",
      `실시간 연결 실패: ${liveErrors.join(" / ")}`
    ),
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  const requestedCode = request.nextUrl.pathname.split("/")[3] || "TAE";
  const airport = airportByCode(requestedCode);
  if (!airport || airport.source !== "kac") {
    return NextResponse.json({ error: "지원하지 않는 KAC 공항입니다." }, { status: 404 });
  }
  return handleKacFlights(request, airport.code, airport.name);
}
