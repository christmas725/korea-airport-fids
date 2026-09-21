import "server-only";

import { airports, type Airport } from "@/lib/airports";
import { getKacModeWindowState } from "@/lib/fids/operationWindow";
import { fetchInitialJson } from "@/lib/fids/serverInitial";
import { isWithinCompletedFlightGrace } from "@/lib/fids/visibility";
import type { FlightMode, FlightsPayload } from "@/lib/tae/types";

export type RuntimeAirportStatus = "live" | "preparing" | "ended";
export type AirportStatusMap = Record<string, RuntimeAirportStatus>;

const MODES: FlightMode[] = ["departures", "arrivals"];
const DIRECTORY_COMPLETED_FLIGHT_GRACE_MS = 60_000;
const CONNECTED_KAC_SOURCES = new Set(["kac_odcloud", "kac_homepage", "kac_gw"]);

function fallbackStatus(airport: Airport, now: Date): RuntimeAirportStatus {
  if (airport.source === "icn") return "live";
  if (airport.code.toUpperCase() === "MWX") return "ended";

  const states = MODES.map((mode) => getKacModeWindowState(mode, airport.code, now));
  if (states.includes("active")) return "live";
  if (states.includes("preparing")) return "preparing";
  return "ended";
}

async function fetchMode(
  airport: Airport,
  mode: FlightMode,
  timeoutMs: number
): Promise<FlightsPayload | null> {
  const payload = await fetchInitialJson<FlightsPayload>(
    `/api/airports/${airport.code.toLowerCase()}/flights?mode=${mode}`,
    timeoutMs
  );
  if (!payload || payload.mode !== mode || !CONNECTED_KAC_SOURCES.has(payload.source)) {
    return null;
  }
  return payload;
}

async function resolveAirportStatus(
  airport: Airport,
  now: Date,
  timeoutMs: number
): Promise<RuntimeAirportStatus> {
  const fallback = fallbackStatus(airport, now);
  if (airport.source === "icn" || airport.code.toUpperCase() === "MWX") return fallback;

  const [departures, arrivals] = await Promise.all([
    fetchMode(airport, "departures", timeoutMs),
    fetchMode(airport, "arrivals", timeoutMs),
  ]);

  const payloads: Record<FlightMode, FlightsPayload | null> = {
    departures,
    arrivals,
  };
  const nowMs = now.getTime();
  const states = Object.fromEntries(
    MODES.map((mode) => [
      mode,
      getKacModeWindowState(mode, airport.code, now, payloads[mode]?.flights),
    ])
  ) as Record<FlightMode, ReturnType<typeof getKacModeWindowState>>;

  for (const mode of MODES) {
    const payload = payloads[mode];
    if (!payload || states[mode] !== "active") continue;
    const hasVisibleFlight = payload.flights.some((flight) =>
      isWithinCompletedFlightGrace(
        flight,
        nowMs,
        DIRECTORY_COMPLETED_FLIGHT_GRACE_MS
      )
    );
    if (hasVisibleFlight) return "live";
  }

  // 한쪽이라도 제한시간 안에 응답하지 않으면 공항을 잘못 종료시키지 않고
  // 공항별 시간 규칙을 즉시 사용한다.
  if (!departures || !arrivals) return fallback;

  if (MODES.some((mode) => states[mode] === "preparing")) return "preparing";
  return "ended";
}

export function getRuleBasedAirportStatuses(now = new Date()): AirportStatusMap {
  return Object.fromEntries(
    airports.map((airport) => [airport.code, fallbackStatus(airport, now)])
  );
}

export async function getInitialAirportStatuses(
  timeoutMs = 650,
  now = new Date()
): Promise<AirportStatusMap> {
  const entries = await Promise.all(
    airports.map(async (airport) => [
      airport.code,
      await resolveAirportStatus(airport, now, timeoutMs),
    ] as const)
  );
  return Object.fromEntries(entries);
}
