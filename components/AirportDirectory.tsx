"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { airports, regions, type Airport } from "@/lib/airports";
import { getKacModeWindowState } from "@/lib/fids/operationWindow";
import { isWithinCompletedFlightGrace } from "@/lib/fids/visibility";
import type { FlightMode, FlightsPayload } from "@/lib/tae/types";

type RuntimeAirportStatus = "live" | "preparing" | "ended";
type StatusMap = Record<string, RuntimeAirportStatus>;
type ModeSnapshot = {
  flights: FlightsPayload["flights"];
  hasVisibleFlights: boolean;
};

const STATUS_POLL_MS = 30_000;
const DIRECTORY_COMPLETED_FLIGHT_GRACE_MS = 60_000;
const MODES: FlightMode[] = ["departures", "arrivals"];
const ACTIVE_CHECK_ORDER: FlightMode[] = ["arrivals", "departures"];
const CONNECTED_KAC_SOURCES = new Set(["kac_odcloud", "kac_homepage", "kac_gw"]);

function windowStatusForAirport(airport: Airport, now: Date): RuntimeAirportStatus {
  if (airport.source === "icn") return "live";
  if (airport.code.toUpperCase() === "MWX") return "ended";

  const states = MODES.map((mode) => getKacModeWindowState(mode, airport.code, now));
  if (states.includes("active")) return "live";
  if (states.includes("preparing")) return "preparing";
  return "ended";
}

function initialStatuses(): StatusMap {
  const now = new Date();
  return Object.fromEntries(
    airports.map((airport) => [airport.code, windowStatusForAirport(airport, now)])
  );
}

async function fetchModeSnapshot(
  airport: Airport,
  mode: FlightMode,
  nowMs: number,
  signal?: AbortSignal
): Promise<ModeSnapshot | null> {
  try {
    const response = await fetch(
      `/api/airports/${airport.code.toLowerCase()}/flights?mode=${mode}`,
      { cache: "no-store", signal }
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as FlightsPayload;
    if (payload.mode !== mode || !CONNECTED_KAC_SOURCES.has(payload.source)) return null;

    return {
      flights: payload.flights,
      hasVisibleFlights: payload.flights.some((flight) =>
        isWithinCompletedFlightGrace(
          flight,
          nowMs,
          DIRECTORY_COMPLETED_FLIGHT_GRACE_MS
        )
      ),
    };
  } catch {
    return null;
  }
}

async function resolveAirportStatus(
  airport: Airport,
  now: Date,
  signal?: AbortSignal
): Promise<RuntimeAirportStatus> {
  const fallback = windowStatusForAirport(airport, now);
  if (airport.source === "icn" || airport.code.toUpperCase() === "MWX") return fallback;

  const states = Object.fromEntries(
    MODES.map((mode) => [mode, getKacModeWindowState(mode, airport.code, now)])
  ) as Record<FlightMode, ReturnType<typeof getKacModeWindowState>>;

  const nowMs = now.getTime();
  let lookupFailed = false;

  // API의 당일 첫 운항편이 규칙보다 빠르면 그 편의 1시간 전으로
  // 해당 모드의 표시 시작시각을 당긴다. 도착편을 먼저 확인해 운영 중이면
  // 출발편 요청은 생략해 불필요한 호출을 줄인다.
  for (const mode of ACTIVE_CHECK_ORDER) {
    const snapshot = await fetchModeSnapshot(airport, mode, nowMs, signal);
    if (!snapshot) {
      lookupFailed = true;
      continue;
    }

    states[mode] = getKacModeWindowState(
      mode,
      airport.code,
      now,
      snapshot.flights
    );

    if (states[mode] === "active" && snapshot.hasVisibleFlights) return "live";
  }

  // API 오류 때문에 실제 운영 중인 공항을 종료로 잘못 내리지 않는다.
  if (lookupFailed) return fallback;

  if (MODES.some((mode) => states[mode] === "preparing")) return "preparing";
  return "ended";
}

function statusLabel(status: RuntimeAirportStatus) {
  if (status === "live") return "운영 중";
  if (status === "preparing") return "운영 준비중";
  return "운영 종료";
}

export default function AirportDirectory() {
  const [statuses, setStatuses] = useState<StatusMap>(initialStatuses);

  const refreshStatuses = useCallback(async (signal?: AbortSignal) => {
    const now = new Date();
    const resolved = await Promise.all(
      airports.map(async (airport) => [
        airport.code,
        await resolveAirportStatus(airport, now, signal),
      ] as const)
    );

    if (!signal?.aborted) setStatuses(Object.fromEntries(resolved));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;

    const schedule = async () => {
      await refreshStatuses(controller.signal);
      if (controller.signal.aborted) return;
      timer = window.setTimeout(schedule, STATUS_POLL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshStatuses(controller.signal);
    };

    void schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      controller.abort();
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshStatuses]);

  const counts = useMemo(() => {
    const values = airports.map((airport) => statuses[airport.code] ?? "ended");
    const live = values.filter((status) => status === "live").length;
    const preparing = values.filter((status) => status === "preparing").length;
    const ended = values.filter((status) => status === "ended").length;
    return { live, preparing, ended, available: live + preparing };
  }, [statuses]);

  return (
    <main className="directory-shell">
      <header className="directory-header">
        <div>
          <p className="eyebrow">KOREA AIRPORT FLIGHT INFORMATION</p>
          <h1>대한민국 국내공항 통합 FIDS</h1>
          <p className="directory-intro">
            공항을 선택하면 실시간 운항정보 전광판으로 이동합니다.
          </p>
        </div>
        <div
          className="network-status"
          aria-label={`${airports.length}개 공항 중 ${counts.available}개 운영 가능, 운영 준비중 포함`}
        >
          <span className="status-light" />
          <strong>{counts.available}</strong>
          <span>/ {airports.length} AIRPORTS LIVE</span>
        </div>
      </header>

      <section className="live-strip" aria-label="공항 운영 현황">
        <span>NOW BOARDING</span>
        <p>
          운영 중 {counts.live} · 운영 준비중 {counts.preparing} · 운영 종료 {counts.ended}
        </p>
      </section>

      <div className="region-list">
        {regions.map((region) => {
          const regionAirports = airports.filter((airport) => airport.region === region);
          return (
            <section className="region-section" key={region}>
              <div className="region-heading">
                <h2>{region}</h2>
                <span>{String(regionAirports.length).padStart(2, "0")}</span>
              </div>
              <div className="airport-grid">
                {regionAirports.map((airport) => {
                  const runtimeStatus = statuses[airport.code] ?? "ended";
                  return (
                    <a
                      className={`airport-card is-${runtimeStatus}`}
                      href={`/airports/${airport.code.toLowerCase()}`}
                      key={airport.code}
                      aria-label={`${airport.name}공항 ${statusLabel(runtimeStatus)}`}
                    >
                      <div className="airport-card-top">
                        <strong className="airport-code">{airport.code}</strong>
                        <span className="airport-state">{statusLabel(runtimeStatus)}</span>
                      </div>
                      <div className="airport-name">
                        <strong>{airport.name}공항</strong>
                        <span>{airport.englishName} Airport</span>
                      </div>
                      <div className="airport-card-bottom">
                        <span>{airport.modes}</span>
                        <b aria-hidden="true">→</b>
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="directory-footer">
        <span>실시간 공개 운항정보를 바탕으로 제공됩니다.</span>
        <strong>대한민국 국내공항 통합 FIDS</strong>
      </footer>
    </main>
  );
}