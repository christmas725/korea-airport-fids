"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OperationNotice from "@/components/fids/OperationNotice";
import AirlineLogo from "@/components/fids/AirlineLogo";
import SlidingText from "@/components/fids/SlidingText";
import { useRowsPerPage } from "@/components/fids/useRowsPerPage";
import { paginateFidsRows } from "@/lib/fids/layout";
import { getKacModeWindowState } from "@/lib/fids/operationWindow";
import {
  flightDisplayDateTime,
  isCompletedFlight,
  isWithinCompletedFlightGrace,
  parseKstDateTime,
} from "@/lib/fids/visibility";
import type { Airport } from "@/lib/airports";
import { destinationName } from "@/lib/tae/airportNames";
import {
  directionForAirport,
  languageTagForAirport,
  localDestinationName,
  localizedStatus,
  type DisplayLanguage,
} from "@/lib/tae/destinationLocales";
import type { FidsFlight, FlightMode, FlightsPayload } from "@/lib/tae/types";

type FlightGroup = { id: string; primary: FidsFlight; variants: FidsFlight[] };
type DepartureSignalState = {
  key: string;
  observedAt: number;
  flight: FidsFlight;
};

const DATA_POLL_MS = 60_000;
const ROTATION_MS = 4_000;
const DEPARTURE_SIGNAL_GRACE_MS = 5 * 60_000;
const LANGUAGES: DisplayLanguage[] = ["KO", "EN", "LOCAL"];

function previewTestSuffix() {
  if (typeof window === "undefined") return "";
  const current = new URLSearchParams(window.location.search);
  const next = new URLSearchParams();
  const test = current.get("test");
  const time = current.get("time");
  if (test) next.set("test", test);
  if (time) next.set("time", time);
  const query = next.toString();
  return query ? `&${query}` : "";
}

function testAwareNow(dataSources?: string[]) {
  const isPreviewTest =
    dataSources?.some((source) => source.startsWith("preview-test:")) ?? false;
  if (typeof window === "undefined" || !isPreviewTest) return new Date();

  const params = new URLSearchParams(window.location.search);
  if (!params.get("test")) return new Date();

  const time = (params.get("time") || "").replace(/\D/g, "").slice(0, 4);
  if (!/^([01]\d|2[0-3])[0-5]\d$/.test(time)) return new Date();

  const real = new Date();
  const kst = new Date(real.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate(),
      Number(time.slice(0, 2)) - 9,
      Number(time.slice(2, 4))
    )
  );
}


function formatTime(value: string) {
  const date = parseKstDateTime(value);
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

function displayStatus(value: string, mode: FlightMode, language: DisplayLanguage, airportCode: string) {
  const status = value.trim() || (mode === "departures" ? "정시" : "예정");
  return localizedStatus(status, language, airportCode);
}

function isGateChangedStatus(value: string) {
  return /탑승구\s*변경|gate\s*change/i.test(value);
}

function statusClass(value: string) {
  const status = value.toLowerCase();
  if (/결항|cancel/.test(status)) return "cancelled";
  if (/지연|delay|시간\s*변경|changed/.test(status)) return "delayed";
  if (/마감|final|closed/.test(status)) return "final";
  if (/탑승중|boarding/.test(status)) return "boarding";
  if (/탑승장\s*입장|go\s*to\s*gate/.test(status)) return "ready";
  if (/탑승준비|gate open|ready/.test(status)) return "ready";
  if (/출발|도착|departed|arrived/.test(status)) return "complete";
  return "normal";
}

function operationKey(flight: FidsFlight) {
  const master = normalizedId(flight.masterFlightId);
  if (master) return `master:${master}:${flight.scheduleDateTime}:${flight.airportCode}`;
  return [flight.mode, flight.airportCode, flight.scheduleDateTime, flight.estimatedDateTime, flight.facility].join("|");
}

function departureSignalKey(flight: FidsFlight) {
  return [
    normalizedId(flight.masterFlightId || flight.flightId),
    flight.scheduleDateTime,
    flight.airportCode,
  ].join("|");
}

function latestDepartureFlight(flights: FidsFlight[]) {
  return flights.reduce<FidsFlight | null>((latest, flight) => {
    if (flight.mode !== "departures") return latest;
    if (!latest) return flight;

    // KAC API에서 지연/변경된 출발시각이 있으면 원래 예정시각보다 우선한다.
    // 따라서 시간표상 마지막 편이 아니라 실제로 가장 늦게 운항되는 편을
    // 당일 마지막 출발편으로 보고, 그 편의 출발 완료를 기준으로 운항종료를 판단한다.
    const latestAt = flightDisplayDateTime(latest)?.getTime() ?? 0;
    const currentAt = flightDisplayDateTime(flight)?.getTime() ?? 0;
    return currentAt >= latestAt ? flight : latest;
  }, null);
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

function destinationFor(flight: FidsFlight, language: DisplayLanguage) {
  if (language === "KO") return flight.airport || flight.airportCode || "-";

  const airportCode = flight.airportCode.trim().toUpperCase();
  const feedEnglish = flight.airportEnglish?.trim() ?? "";
  const english =
    feedEnglish && feedEnglish.toUpperCase() !== airportCode
      ? feedEnglish
      : destinationName(flight.airportCode, flight.airport, "EN");

  return language === "LOCAL" ? localDestinationName(flight.airportCode, english) : english;
}

function FlightRow({ group, language, rotationStep, mode }: { group: FlightGroup; language: DisplayLanguage; rotationStep: number; mode: FlightMode }) {
  const shown = group.variants[rotationStep % group.variants.length] ?? group.primary;
  const flight = group.primary;
  const scheduled = formatTime(flight.scheduleDateTime);
  const estimated = formatTime(flight.actualDateTime || flight.estimatedDateTime);
  const changed = scheduled !== estimated && estimated !== "--:--";
  const status = displayStatus(flight.remark, mode, language, flight.airportCode);
  const airlineName = shown.airline || shown.airlineEnglish || "-";
  const previousGate =
    mode === "departures" && isGateChangedStatus(flight.remark)
      ? (flight.previousFacility ?? "").trim()
      : "";
  const currentGate = (flight.facility || "-").trim();

  return (
    <div className="flight-row row-grid" role="row">
      <div className="time-cell">
        <strong className={changed ? "time-original" : ""}>{scheduled}</strong>
        {changed && <strong className="time-changed">{estimated}</strong>}
      </div>
      <div className="flight-cell">
        <AirlineLogo flightId={shown.flightId} />
        <div className="flight-copy">
          <strong>{shown.flightId}</strong>
          <span>{airlineName}</span>
        </div>
      </div>
      <div className="destination-cell" lang={languageTagForAirport(flight.airportCode, language)} dir={directionForAirport(flight.airportCode, language)}>
        <strong>
          <SlidingText
            text={destinationFor(flight, language)}
            direction={directionForAirport(flight.airportCode, language)}
          />
        </strong>
        <span>{flight.airportCode || "---"}</span>
      </div>
      <div className="type-cell"><span className={flight.flightType === "국제선" ? "international" : "domestic"}>{flight.flightType}</span></div>
      <div className={`facility-cell${previousGate && previousGate !== currentGate ? " facility-changed" : ""}`}>
        {previousGate && previousGate !== currentGate ? (
          <div className="gate-change" aria-label={`탑승구 ${previousGate}에서 ${currentGate}(으)로 변경`}>
            <span className="gate-previous">{previousGate}</span>
            <span className="gate-arrow" aria-hidden>→</span>
            <strong className="gate-current">{currentGate}</strong>
          </div>
        ) : (
          <strong>{currentGate}</strong>
        )}
      </div>
      <div className={`status-cell ${statusClass(status)}`}>
        <strong><SlidingText text={status} direction={directionForAirport(flight.airportCode, language)} /></strong>
      </div>
    </div>
  );
}

export default function FidsBoard({ airport }: { airport: Airport }) {
  const [mode, setMode] = useState<FlightMode>("departures");
  const [payload, setPayload] = useState<FlightsPayload | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);
  const [rotationStep, setRotationStep] = useState(0);
  const [departureSignal, setDepartureSignal] = useState<DepartureSignalState | null>(null);
  const previousDepartureStatus = useRef<{ key: string; completed: boolean } | null>(null);
  const rowsPerPage = useRowsPerPage();
  const language = LANGUAGES[Math.floor(rotationStep / 2) % LANGUAGES.length];

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/airports/${airport.code.toLowerCase()}/flights?mode=${mode}${previewTestSuffix()}`, { cache: "no-store" });
      const json = (await response.json()) as FlightsPayload & { error?: string };
      if (!response.ok) throw new Error(json.error || "운항정보를 불러오지 못했습니다.");
      setPayload(json);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "운항정보를 불러오지 못했습니다.");
    }
  }, [airport.code, mode]);

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
    const updateClock = () => setNow(testAwareNow(payload?.dataSources));
    updateClock();
    const clock = window.setInterval(updateClock, 1000);
    const rotation = window.setInterval(() => setRotationStep((value) => value + 1), ROTATION_MS);
    return () => { window.clearInterval(clock); window.clearInterval(rotation); };
  }, [payload?.dataSources]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "1" || event.key.toLowerCase() === "d") setMode("departures");
      if (event.key === "2" || event.key.toLowerCase() === "a") setMode("arrivals");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentPayload = payload?.mode === mode ? payload : null;
  const latestDeparture = useMemo(
    () => mode === "departures" && currentPayload ? latestDepartureFlight(currentPayload.flights) : null,
    [currentPayload, mode]
  );
  const latestDepartureKey = latestDeparture ? departureSignalKey(latestDeparture) : "";

  useEffect(() => {
    if (mode !== "departures" || !latestDeparture) {
      previousDepartureStatus.current = null;
      return;
    }

    const key = departureSignalKey(latestDeparture);
    const completed = isCompletedFlight(latestDeparture);
    const previous = previousDepartureStatus.current;

    if (!completed) {
      previousDepartureStatus.current = { key, completed: false };
      if (departureSignal?.key === key) setDepartureSignal(null);
      return;
    }

    if (departureSignal?.key === key) {
      previousDepartureStatus.current = { key, completed: true };
      return;
    }

    const storageKey = `kac-fids-departure-signal:${airport.code}:${key}`;
    const storedAt = Number(window.localStorage.getItem(storageKey));
    const transitionedWhileOpen = previous?.key === key && previous.completed === false;
    let observedAt = Date.now();

    if (Number.isFinite(storedAt) && storedAt > 0) {
      observedAt = storedAt;
    } else if (!transitionedWhileOpen) {
      const fallbackAt = flightDisplayDateTime(latestDeparture)?.getTime();
      if (typeof fallbackAt === "number" && Number.isFinite(fallbackAt)) observedAt = fallbackAt;
    }

    window.localStorage.setItem(storageKey, String(observedAt));
    setDepartureSignal({ key, observedAt, flight: latestDeparture });
    previousDepartureStatus.current = { key, completed: true };
  }, [airport.code, departureSignal?.key, latestDeparture, mode]);

  const departureSignalHoldActive = Boolean(
    mode === "departures" &&
    departureSignal &&
    now.getTime() < departureSignal.observedAt + DEPARTURE_SIGNAL_GRACE_MS
  );

  const flights = useMemo(() => {
    const current = currentPayload ? [...currentPayload.flights] : [];

    if (
      mode === "departures" &&
      departureSignalHoldActive &&
      departureSignal &&
      !current.some((flight) => departureSignalKey(flight) === departureSignal.key)
    ) {
      current.push(departureSignal.flight);
    }

    return current.filter((flight) => {
      const isLastDeparture =
        mode === "departures" &&
        (departureSignalKey(flight) === latestDepartureKey ||
          Boolean(departureSignal && departureSignalKey(flight) === departureSignal.key));

      if (isLastDeparture) {
        if (!isCompletedFlight(flight)) return true;
        if (!departureSignal || departureSignal.key !== departureSignalKey(flight)) return true;
        return now.getTime() < departureSignal.observedAt + DEPARTURE_SIGNAL_GRACE_MS;
      }

      return isWithinCompletedFlightGrace(flight, now.getTime());
    });
  }, [currentPayload, departureSignal, departureSignalHoldActive, latestDepartureKey, mode, now]);

  const groups = useMemo(() => groupFlights(flights), [flights]);
  const isMuanSuspended = airport.code.toUpperCase() === "MWX";
  const operationWindowState = getKacModeWindowState(
    mode,
    airport.code,
    now,
    currentPayload?.flights
  );
  const isPreparing = operationWindowState === "preparing";
  const showPreparationNotice = Boolean(currentPayload && !error && isPreparing);
  const showEndedNotice = Boolean(
    currentPayload &&
    !error &&
    !isPreparing &&
    !departureSignalHoldActive &&
    groups.length === 0
  );
  const operationNoticeActive = isMuanSuspended || showPreparationNotice || showEndedNotice;
  const displayGroups = operationNoticeActive ? [] : groups;
  const pageWindow = useMemo(
    () => paginateFidsRows(displayGroups, page, rowsPerPage),
    [displayGroups, page, rowsPerPage]
  );
  const totalPages = pageWindow.totalPages;

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    if (totalPages <= 1) { setPage(0); return; }
    const interval = window.setInterval(() => setPage((value) => (value + 1) % totalPages), ROTATION_MS * 6);
    return () => window.clearInterval(interval);
  }, [totalPages]);

  const rows = pageWindow.rows;
  const blanks = Array.from({ length: pageWindow.emptyRowCount });
  const departure = mode === "departures";
  const connected =
    currentPayload?.source === "kac_odcloud" ||
    currentPayload?.source === "kac_homepage" ||
    currentPayload?.source === "kac_gw";
  const airportName = `${airport.name}${airport.international ? "국제공항" : "공항"}`;
  const airportEnglishName = `${airport.englishName.toUpperCase()} ${airport.international ? "INTERNATIONAL AIRPORT" : "AIRPORT"}`;
  const footerMessage = isMuanSuspended
    ? "무안공항 임시 운영중단 안내 표시 중"
    : showPreparationNotice
      ? "금일 운항 준비중 안내 표시 중"
      : showEndedNotice
        ? "운항 종료 안내 표시 중"
        : departureSignalHoldActive
          ? "마지막 출발편 출발 확인 후 5분간 표시 중"
          : currentPayload?.warning || error || "60초마다 자동 갱신";

  return (
    <main className="screen-shell">
      <section className={`fids-frame ${departure ? "departure-theme" : "arrival-theme"}`}>
        <aside className="identity-rail">
          <div className="airport-brand">
            <span className="mode-icon" aria-hidden>{departure ? "↗" : "↘"}</span>
            <div className="mode-title"><strong>{departure ? "출발" : "도착"}</strong><span>{departure ? "DEPARTURES" : "ARRIVALS"}</span></div>
          </div>

          <div className="airport-copy"><strong>{airportName}</strong><span>{airportEnglishName}</span><b>{airport.code}</b></div>

          <div className="mode-switch" aria-label="출발 도착 전환">
            <button className={departure ? "active" : ""} onClick={() => setMode("departures")}><span>출발</span><small>1 · D</small></button>
            <button className={!departure ? "active" : ""} onClick={() => setMode("arrivals")}><span>도착</span><small>2 · A</small></button>
          </div>

          <div className="rail-spacer" />
          <div className="page-number">{String(page + 1).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}</div>
          <div className="rail-time"><strong>{formatClock(now)}</strong><span>{formatDate(now)}</span></div>
          <div className="rail-brand">KAC · {airport.code} FIDS v0.1</div>
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

          <div className={`rows${operationNoticeActive ? " notice-active" : ""}`} key={`${mode}-${page}`}>
            {rows.map((group) => <FlightRow key={group.id} group={group} language={language} rotationStep={rotationStep} mode={mode} />)}
            {blanks.map((_, index) => <div className="flight-row blank-row row-grid" key={`blank-${index}`} aria-hidden><div /><div /><div /><div /><div /><div /></div>)}
            {operationNoticeActive && (
              <OperationNotice
                suspended={isMuanSuspended}
                preparing={!isMuanSuspended && showPreparationNotice}
              />
            )}
          </div>

          <footer className="data-strip">
            <span className={`live-dot ${connected ? "connected" : "demo"}`} />
            <strong>{connected ? "KAC 실시간 연결" : "데모 데이터"}</strong>
            <span>{footerMessage}</span>
            <span className="language-indicator">{language === "KO" ? "한국어" : language === "EN" ? "ENGLISH" : "LOCAL"}</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
