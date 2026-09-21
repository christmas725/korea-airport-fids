"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { airports, regions, type Airport } from "@/lib/airports";
import { getKacModeWindowState } from "@/lib/fids/operationWindow";

type RuntimeAirportStatus = "live" | "preparing" | "ended";
type StatusMap = Record<string, RuntimeAirportStatus>;

type StatusResponse = {
  statuses?: StatusMap;
};

type AirportDirectoryProps = {
  initialStatuses?: StatusMap;
};

const STATUS_POLL_MS = 30_000;
const MODES = ["departures", "arrivals"] as const;

function windowStatusForAirport(airport: Airport, now: Date): RuntimeAirportStatus {
  if (airport.source === "icn") return "live";
  if (airport.code.toUpperCase() === "MWX") return "ended";

  const states = MODES.map((mode) => getKacModeWindowState(mode, airport.code, now));
  if (states.includes("active")) return "live";
  if (states.includes("preparing")) return "preparing";
  return "ended";
}

function ruleBasedStatuses(): StatusMap {
  const now = new Date();
  return Object.fromEntries(
    airports.map((airport) => [airport.code, windowStatusForAirport(airport, now)])
  );
}

function statusLabel(status: RuntimeAirportStatus) {
  if (status === "live") return "운영 중";
  if (status === "preparing") return "운영 준비중";
  return "운영 종료";
}

export default function AirportDirectory({ initialStatuses }: AirportDirectoryProps) {
  const [statuses, setStatuses] = useState<StatusMap>(
    () => initialStatuses ?? ruleBasedStatuses()
  );

  const refreshStatuses = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/airports/status", {
        cache: "no-store",
        signal,
      });
      if (!response.ok) return;

      const payload = (await response.json()) as StatusResponse;
      if (!payload.statuses || signal?.aborted) return;
      setStatuses((current) => ({ ...current, ...payload.statuses }));
    } catch {
      // 초기 서버 상태 또는 기존 상태를 유지한다.
    }
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
                        <span>
                          {airport.englishName} {airport.international ? "International Airport" : "Airport"}
                        </span>
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
