import type { FlightMode } from "@/lib/tae/types";

export type OperationWindowState = "ended" | "preparing" | "active";

const KAC_DEPARTURE_OPERATION_START_MINUTES = 6 * 60;
const KAC_ARRIVAL_OPERATION_START_MINUTES = 5 * 60;
const TAE_ARRIVAL_OPERATION_START_MINUTES = 4 * 60;

export function kstMinutesOfDay(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function getKacOperationStartMinutes(mode: FlightMode, airportCode: string) {
  if (mode === "departures") return KAC_DEPARTURE_OPERATION_START_MINUTES;
  return airportCode.toUpperCase() === "TAE"
    ? TAE_ARRIVAL_OPERATION_START_MINUTES
    : KAC_ARRIVAL_OPERATION_START_MINUTES;
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
