"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { destinationName } from "@/lib/airportNames";
import {
  directionForAirport,
  languageTagForAirport,
  localDestinationName,
  localizedStatus,
  type DisplayLanguage,
} from "@/lib/destinationLocales";
import type { FidsFlight, FlightMode, FlightsPayload } from "@/lib/types";

type FlightGroup = { id: string; primary: FidsFlight; variants: FidsFlight[] };

const PAGE_SIZE = 14;
const MAX_PAGES = 2;
const DATA_POLL_MS = 60_000;
const ROTATION_MS = 4_000;
const DEPARTED_GRACE_MS = 5 * 60_000;
const AIRLINE_LOGO_BASE = "https://images.kiwi.com/airlines/64";
const LANGUAGES: DisplayLanguage[] = ["KO", "EN", "LOCAL"];

function parseDateTime(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return null;
  return new Date(Date.UTC(
    Number(digits.slice(0, 4)),
    Number(digits.slice(4, 6)) - 1,
    Number(digits.slice(6, 8)),
    Number(digits.slice(8, 10)) - 9,
    Number(digits.slice(10, 12))
  ));
}

function formatTime(value: string) {
  const date = parseDateTime(value);
  return date
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
    : "--:--";
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", weekday: "short" }).format(value);
}

function normalizedId(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function airlineCode(value: string) {
  return normalizedId(value).match(/^([A-Z0-9]{2})/)?.[1] ?? "--";
}

function displayStatus(value: string, mode: FlightMode, language: DisplayLanguage, airportCode: string) {
  const status = value.trim() || (mode === "departures" ? "정시" : "예정");
  if (language === "KO") return status;
  if (/도착|arrived/i.test(status)) return language === "EN" ? "Arrived" : "Arrived";
  if (/시간\s*변경|change/i.test(status)) return language === "EN" ? "Time Changed" : "Time Changed";
  if (/예정|scheduled/i.test(status)) return language === "EN" ? "Scheduled" : "Scheduled";
  return localizedStatus(status, language, airportCode);
}

function statusClass(value: string) {
  const status = value.toLowerCase();
  if (/결항|cancel/.test(status)) return "cancelled";
  if (/지연|delay|시간\s*변경|changed/.test(status)) return "delayed";
  if (/마감|final|closed/.test(status)) return "final";
  if (/탑승중|boarding/.test(status)) return "boarding";
  if (/탑승준비|gate open|ready/.test(status)) return "ready";
  if (/출발|도착|departed|arrived/.test(status)) return "complete";
  return "normal";
}

function isComplete(flight: FidsFlight) {
  return flight.mode === "departures" && /^(출발|출발완료|departed)$/i.test(flight.remark.replace(/\s/g, ""));
}

function operationKey(flight: FidsFlight) {
  const master = normalizedId(flight.masterFlightId);
  if (master) return `master:${master}:${flight.scheduleDateTime}:${flight.airportCode}`;
  return [flight.mode, flight.airportCode, flight.scheduleDateTime, flight.estimatedDateTime, flight.facility].join("|");
}

function groupFlights(flights: FidsFlight[]): FlightGroup[] {
  const groups = new Map<string, FidsFlight[]>();
  flights.forEach((flight) => {
    const key = operationKey(flight);
    const list = groups.get(key) ?? [];
    if (!list.some((item) => normalizedId(item.flightId) === normalizedId(flight.flightId))) list.push(flight);
    groups.set(key, list);
  });
  return [...groups.entries()].map(([id, variants]) => ({
    id,
    primary: variants.find((flight) => normalizedId(flight.flightId) === normalizedId(flight.masterFlightId)) ?? variants[0],
    variants,
  }));
}

const AirlineLogo = memo(function AirlineLogo({ flightId }: { flightId: string }) {
  const code = airlineCode(flightId);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [code]);
  return failed ? (
    <span className="logo-fallback">{code}</span>
  ) : (
    <img src={`${AIRLINE_LOGO_BASE}/${code}.png`} alt="" onError={() => setFailed(true)} />
  );
});

function destinationFor(flight: FidsFlight, language: DisplayLanguage) {
  if (language === "KO") return flight.airport || flight.airportCode || "-";
  const english = flight.airportEnglish || destinationName(flight.airportCode, flight.airport, "EN");
  return language === "LOCAL" ? localDestinationName(flight.airportCode, english) : english;
}

function FlightRow({ group, language, rotationStep, mode }: { group: FlightGroup; language: DisplayLanguage; rotationStep: number; mode: FlightMode }) {
  const shown = group.variants[rotationStep % group.variants.length] ?? group.primary;
  const flight = group.primary;
  const scheduled = formatTime(flight.scheduleDateTime);
  const estimated = formatTime(flight.actualDateTime || flight.estimatedDateTime);
  const changed = scheduled !== estimated && estimated !== "--:--";
  const status = displayStatus(flight.remark, mode, language, flight.airportCode);

  return (
    <div className="flight-row row-grid" role="row">
      <div className="time-cell">
        <strong className={changed ? "time-original" : ""}>{scheduled}</strong>
        {changed && <strong className="time-changed">{estimated}</strong>}
      </div>
      <div className="flight-cell">
        <AirlineLogo flightId={shown.flightId} />
        <span>{shown.flightId}</span>
      </div>
      <div className="destination-cell" lang={languageTagForAirport(flight.airportCode, language)} dir={directionForAirport(flight.airportCode, language)}>
        <strong>{destinationFor(flight, language)}</strong>
        <span>{flight.airportCode || "---"}</span>
      </div>
      <div className="type-cell"><span className={flight.flightType === "국제선" ? "international" : "domestic"}>{flight.flightType}</span></div>
      <div className="facility-cell"><strong>{flight.facility || "-"}</strong></div>
      <div className={`status-cell ${statusClass(status)}`}><strong>{status}</strong></div>
    </div>
  );
}

export default function FidsBoard() {
  const [mode, setMode] = useState<FlightMode>("departures");
  const [payload, setPayload] = useState<FlightsPayload | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);
  const [rotationStep, setRotationStep] = useState(0);
  const language = LANGUAGES[Math.floor(rotationStep / 2) % LANGUAGES.length];

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/flights?mode=${mode}`, { cache: "no-store" });
      const json = (await response.json()) as FlightsPayload & { error?: string };
      if (!response.ok) throw new Error(json.error || "운항정보를 불러오지 못했습니다.");
      setPayload(json);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "운항정보를 불러오지 못했습니다.");
    }
  }, [mode]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, DATA_POLL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    setPage(0);
    setRotationStep(0);
  }, [mode]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const rotation = window.setInterval(() => setRotationStep((value) => value + 1), ROTATION_MS);
    return () => { window.clearInterval(clock); window.clearInterval(rotation); };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "1" || event.key.toLowerCase() === "d") setMode("departures");
      if (event.key === "2" || event.key.toLowerCase() === "a") setMode("arrivals");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const flights = useMemo(() => {
    const current = payload?.mode === mode ? payload.flights : [];
    const cutoff = Date.now() - DEPARTED_GRACE_MS;
    return current.filter((flight) => {
      if (!isComplete(flight)) return true;
      const actual = parseDateTime(flight.actualDateTime || flight.estimatedDateTime)?.getTime() ?? Date.now();
      return actual >= cutoff;
    });
  }, [payload, mode, now]);

  const groups = useMemo(() => groupFlights(flights).slice(0, PAGE_SIZE * MAX_PAGES), [flights]);
  const totalPages = Math.max(1, Math.min(MAX_PAGES, Math.ceil(groups.length / PAGE_SIZE)));

  useEffect(() => {
    if (totalPages <= 1) { setPage(0); return; }
    const interval = window.setInterval(() => setPage((value) => (value + 1) % totalPages), ROTATION_MS * 6);
    return () => window.clearInterval(interval);
  }, [totalPages]);

  const rows = groups.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const blanks = Array.from({ length: Math.max(0, PAGE_SIZE - rows.length) });
  const departure = mode === "departures";
  const currentPayload = payload?.mode === mode ? payload : null;
  const connected =
    currentPayload?.source === "kac_odcloud" ||
    currentPayload?.source === "kac_homepage" ||
    currentPayload?.source === "kac_gw";

  return (
    <main className="screen-shell">
      <section className={`fids-frame ${departure ? "departure-theme" : "arrival-theme"}`}>
        <aside className="identity-rail">
          <div className="airport-brand">
            <span className="mode-icon" aria-hidden>{departure ? "↗" : "↘"}</span>
            <div className="mode-title"><strong>{departure ? "출발" : "도착"}</strong><span>{departure ? "DEPARTURES" : "ARRIVALS"}</span></div>
          </div>

          <div className="airport-copy"><strong>대구국제공항</strong><span>DAEGU INTERNATIONAL AIRPORT</span><b>TAE</b></div>

          <div className="mode-switch" aria-label="출발 도착 전환">
            <button className={departure ? "active" : ""} onClick={() => setMode("departures")}><span>출발</span><small>1 · D</small></button>
            <button className={!departure ? "active" : ""} onClick={() => setMode("arrivals")}><span>도착</span><small>2 · A</small></button>
          </div>

          <div className="rail-spacer" />
          <div className="page-number">{String(page + 1).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}</div>
          <div className="rail-time"><strong>{formatClock(now)}</strong><span>{formatDate(now)}</span></div>
          <div className="rail-brand">KAC · TAE FIDS v0.1</div>
        </aside>

        <section className="information-panel">
          <header className="table-head row-grid" role="row">
            <div><b>{departure ? "출발시각" : "도착시각"}</b><span>{departure ? "TIME" : "ARRIVAL"}</span></div>
            <div><b>항공사 / 편명</b><span>AIRLINE / FLIGHT</span></div>
            <div><b>{departure ? "목적지" : "출발지"}</b><span>{departure ? "DESTINATION" : "ORIGIN"}</span></div>
            <div><b>구분</b><span>TYPE</span></div>
            <div><b>{departure ? "탑승구" : "수하물"}</b><span>{departure ? "GATE" : "BAGGAGE"}</span></div>
            <div><b>현황</b><span>STATUS</span></div>
          </header>

          <div className="rows" key={`${mode}-${page}`}>
            {rows.map((group) => <FlightRow key={group.id} group={group} language={language} rotationStep={rotationStep} mode={mode} />)}
            {blanks.map((_, index) => <div className="flight-row blank-row row-grid" key={`blank-${index}`} aria-hidden><div /><div /><div /><div /><div /><div /></div>)}
          </div>

          <footer className="data-strip">
            <span className={`live-dot ${connected ? "connected" : "demo"}`} />
            <strong>{connected ? "KAC 실시간 연결" : "데모 데이터"}</strong>
            <span>{currentPayload?.warning || error || "60초마다 자동 갱신"}</span>
            <span className="language-indicator">{language === "KO" ? "한국어" : language === "EN" ? "ENGLISH" : "LOCAL"}</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
