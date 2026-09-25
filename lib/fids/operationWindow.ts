import type { FlightMode } from "@/lib/tae/types";

export type OperationWindowState = "ended" | "preparing" | "active";

type AirportOperationStart = {
  departures: number;
  arrivals: number;
};

type ScheduledFlight = {
  scheduleDateTime: string;
  flightId?: string;
  remark?: string;
};

const hour = (value: number) => value * 60;

const DEFAULT_OPERATION_START: AirportOperationStart = {
  departures: hour(6),
  arrivals: hour(6),
};

const KAC_OPERATION_STARTS: Record<string, AirportOperationStart> = {
  TAE: { departures: hour(6), arrivals: hour(5) },
  GMP: { departures: hour(6), arrivals: hour(6) },
  CJU: { departures: hour(6), arrivals: hour(6) },
  CJJ: { departures: hour(6), arrivals: hour(6) },
  MWX: { departures: hour(6), arrivals: hour(6) },
  PUS: { departures: hour(6), arrivals: hour(6) },
  RSU: { departures: hour(6), arrivals: hour(6) },
  USN: { departures: hour(6), arrivals: hour(6) },
  KPO: { departures: hour(6), arrivals: hour(6) },
  KWJ: { departures: hour(7), arrivals: hour(7) },
  HIN: { departures: hour(7), arrivals: hour(7) },
  WJU: { departures: hour(7), arrivals: hour(7) },
  YNY: { departures: hour(8), arrivals: hour(8) },
  KUV: { departures: hour(9), arrivals: hour(9) },
};

function hasActiveOvernightYFlight(mode: FlightMode, flights?: ScheduledFlight[]) {
  if (mode !== "departures") return false;

  return flights?.some((flight) => {
    const flightId = (flight.flightId ?? "").replace(/\s+/g, "").toUpperCase();
    if (!flightId.slice(2).includes("Y")) return false;

    const status = (flight.remark ?? "").trim().toLowerCase();
    return (
      status.includes("게이트") ||
      status.includes("탑승") ||
      status.includes("마감") ||
      status.startsWith("출발") ||
      /gate\s*change|gate\s*open|ready|boarding|final\s*call|gate\s*(closing|closed)|departed/.test(status)
    );
  }) ?? false;
}

function kstDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}${read("month")}${read("day")}`;
}

function scheduleMinutesForDate(value: string, dateKey: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12 || digits.slice(0, 8) !== dateKey) return null;

  const hours = Number(digits.slice(8, 10));
  const minutes = Number(digits.slice(10, 12));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function kstMinutesOfDay(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const hourPart = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minutePart = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hourPart * 60 + minutePart;
}

export function getKacOperationStartMinutes(mode: FlightMode, airportCode: string) {
  const airportStart = KAC_OPERATION_STARTS[airportCode.toUpperCase()] ?? DEFAULT_OPERATION_START;
  return airportStart[mode];
}

export function getEarliestApiFlightMinutes(
  flights: ScheduledFlight[] | undefined,
  now: Date
) {
  if (!flights?.length) return null;

  const dateKey = kstDateKey(now);
  let earliest: number | null = null;

  for (const flight of flights) {
    const minutes = scheduleMinutesForDate(flight.scheduleDateTime, dateKey);
    if (minutes === null) continue;
    if (earliest === null || minutes < earliest) earliest = minutes;
  }

  return earliest;
}

export function getKacFlightDisplayStartMinutes(
  mode: FlightMode,
  airportCode: string,
  now: Date,
  flights?: ScheduledFlight[]
) {
  const configuredDisplayStart = Math.max(
    0,
    getKacOperationStartMinutes(mode, airportCode) - 60
  );
  const earliestApiFlight = getEarliestApiFlightMinutes(flights, now);

  if (earliestApiFlight === null) return configuredDisplayStart;

  const apiDisplayStart = Math.max(0, earliestApiFlight - 60);
  return Math.min(configuredDisplayStart, apiDisplayStart);
}

export function getKacModeWindowState(
  mode: FlightMode,
  airportCode: string,
  now: Date,
  flights?: ScheduledFlight[]
): OperationWindowState {
  if (hasActiveOvernightYFlight(mode, flights)) {
    return "active";
  }

  const currentMinutes = kstMinutesOfDay(now);
  const flightDisplayStartMinutes = getKacFlightDisplayStartMinutes(
    mode,
    airportCode,
    now,
    flights
  );

  // Once the calendar date changes, the next operating day is considered to be
  // in preparation until its FIDS display window opens. Ended is decided later
  // from the absence of remaining flights after the display window has opened.
  if (currentMinutes < flightDisplayStartMinutes) return "preparing";
  return "active";
}
