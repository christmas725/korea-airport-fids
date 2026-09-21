import type { FlightMode } from "@/lib/tae/types";

export type OperationWindowState = "ended" | "preparing" | "active";

type AirportOperationStart = {
  departures: number;
  arrivals: number;
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

export function getKacModeWindowState(
  mode: FlightMode,
  airportCode: string,
  now: Date
): OperationWindowState {
  const currentMinutes = kstMinutesOfDay(now);
  const operationStartMinutes = getKacOperationStartMinutes(mode, airportCode);
  const preparationStartMinutes = operationStartMinutes - 2 * 60;
  const flightDisplayStartMinutes = operationStartMinutes - 60;

  if (currentMinutes < preparationStartMinutes) return "ended";
  if (currentMinutes < flightDisplayStartMinutes) return "preparing";
  return "active";
}
