"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { DeparturesPayload, DepartureFlight } from "@/lib/types";
import { destinationName } from "@/lib/airportNames";
import {
  directionForAirport,
  languageTagForAirport,
  localDestinationName,
  localizedStatus,
  type DisplayLanguage,
} from "@/lib/destinationLocales";

type TerminalFilter = "ALL" | "T1" | "T2";

type FlightGroup = {
  id: string;
  masterId: string;
  primary: DepartureFlight;
  variants: DepartureFlight[];
};

type DepartedCacheEntry = {
  flight: DepartureFlight;
  firstSeenAt: number;
};

const PAGE_SIZE = 15;
const MAX_PAGES = 2;
const MAX_OPERATIONS = PAGE_SIZE * MAX_PAGES;
const ROTATION_INTERVAL_MS = 3_000;
const DATA_POLL_INTERVAL_MS = 60_000;
const DEPARTED_GRACE_MS = 5 * 60_000;
const DEPARTED_CACHE_KEY = "icn-fids-departed-grace-v1";
const MIN_STEPS_PER_LANGUAGE = 2;
const AIRLINE_LOGO_BASE = "https://images.kiwi.com/airlines/64";

function parseApiDateTime(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return null;

  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  const hh = Number(digits.slice(8, 10));
  const mm = Number(digits.slice(10, 12));

  return new Date(Date.UTC(y, m - 1, d, hh - 9, mm));
}

function hhmm(value: string) {
  const d = parseApiDateTime(value);
  if (!d) return "--:--";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function isChanged(flight: DepartureFlight) {
  if (!flight.scheduleDateTime || !flight.estimatedDateTime) return false;
  return hhmm(flight.scheduleDateTime) !== hhmm(flight.estimatedDateTime);
}

function displayStatus(value: string) {
  return value
    .replace(/\bcode\s*share\b/gi, "")
    .replace(/\bcodeshare\b/gi, "")
    .replace(/\bcodeshar\b/gi, "")
    .replace(/코드\s*쉐어/gi, "")
    .replace(/공동\s*운항/gi, "")
    .replace(/^[\s\/|·•,-]+|[\s\/|·•,-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isDepartedStatus(value: string) {
  const status = displayStatus(value).trim();
  if (!status) return false;

  return (
    /^출발(?:\s*완료)?$/i.test(status) ||
    /^departed(?:\s|$)/i.test(status)
  );
}

function statusClass(status: string) {
  const s = status.toLowerCase();

  if (s.includes("결항") || s.includes("cancel")) return "cancelled";
  if (s.includes("지연") || s.includes("delay")) return "delayed";
  if (s.includes("마감") || s.includes("final") || s.includes("closed")) return "final";
  if (s.includes("탑승중") || s.includes("boarding")) return "boarding";
  if (s.includes("탑승준비") || s.includes("gate open") || s.includes("ready")) return "ready";
  if (s.includes("출발") || s.includes("depart")) return "departed";

  return "normal";
}

function formatDate(now: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(now);
}

function formatClock(now: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function terminalGroup(flight: DepartureFlight) {
  return flight.terminalId === "P03" ? "T2" : "T1";
}

function terminalCopy(terminal: TerminalFilter) {
  if (terminal === "T1") {
    return { ko: "제1여객터미널", en: "Terminal 1", short: "T1" };
  }

  if (terminal === "T2") {
    return { ko: "제2여객터미널", en: "Terminal 2", short: "T2" };
  }

  return { ko: "전체 터미널", en: "All Terminals", short: "ALL" };
}

function normalizeFlightId(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function flightRetentionKey(flight: DepartureFlight) {
  return [
    normalizeFlightId(flight.flightId),
    flight.scheduleDateTime,
    flight.airportCode.trim().toUpperCase(),
    terminalGroup(flight),
  ].join("|");
}

function airlineCode(flightId: string) {
  const normalized = normalizeFlightId(flightId);
  const match = normalized.match(/^([A-Z0-9]{2})/);
  return match?.[1] ?? "--";
}

function groupCodeshareFlights(flights: DepartureFlight[]): FlightGroup[] {
  const referencedMasters = new Set(
    flights
      .map((flight) => normalizeFlightId(flight.masterFlightId || ""))
      .filter(Boolean)
  );

  // airport.kr에는 masterFlightId가 없으므로 같은 실제 운항으로 보이는 행을
  // (목적지 + 예정/변경시간 + 터미널 + 게이트 + 체크인) 기준으로 한 묶음으로 본다.
  // 홈페이지에서 코드쉐어 편은 이 값들이 동일하게 반복된다.
  const operationKey = (flight: DepartureFlight) =>
    [
      flight.airportCode.trim().toUpperCase(),
      flight.scheduleDateTime,
      flight.estimatedDateTime,
      terminalGroup(flight),
      flight.gate.trim(),
      flight.checkin.trim(),
    ].join("|");

  const operationCounts = new Map<string, number>();
  flights.forEach((flight) => {
    const key = operationKey(flight);
    operationCounts.set(key, (operationCounts.get(key) ?? 0) + 1);
  });

  const groups = new Map<
    string,
    { masterId: string; items: DepartureFlight[]; order: number }
  >();

  flights.forEach((flight, index) => {
    const flightId = normalizeFlightId(flight.flightId);
    const suppliedMaster = normalizeFlightId(flight.masterFlightId || "");
    const masterId = suppliedMaster || (referencedMasters.has(flightId) ? flightId : "");
    const day = flight.scheduleDateTime.replace(/\D/g, "").slice(0, 8);
    const airportCode = flight.airportCode.trim().toUpperCase();
    const opKey = operationKey(flight);

    const key = masterId
      ? `master:${masterId}:${airportCode}:${day}`
      : (operationCounts.get(opKey) ?? 0) > 1
        ? `operation:${opKey}`
        : `single:${flight.id}`;

    const existing = groups.get(key);
    if (existing) {
      existing.items.push(flight);
      return;
    }
    groups.set(key, { masterId, items: [flight], order: index });
  });

  return Array.from(groups.entries())
    .map(([key, value]) => {
      const uniqueByFlightId = new Map<string, DepartureFlight>();
      value.items.forEach((item) => {
        const id = normalizeFlightId(item.flightId);
        if (!uniqueByFlightId.has(id)) uniqueByFlightId.set(id, item);
      });

      const items = Array.from(uniqueByFlightId.values());
      const primary =
        items.find((item) => normalizeFlightId(item.flightId) === value.masterId) ??
        items.find((item) => !item.codeshare.toUpperCase().includes("SL")) ??
        items[0]!;

      const variants = [primary, ...items.filter((item) => item !== primary)];

      return {
        id: key,
        masterId: value.masterId || normalizeFlightId(primary.flightId),
        primary,
        variants,
        order: value.order,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...group }) => group);
}

const AirlineLogo = memo(function AirlineLogo({ flightId }: { flightId: string }) {
  const code = airlineCode(flightId);
  const [failed, setFailed] = useState(false);

  if (failed || code === "--") {
    return <span className="carrier-mark" aria-hidden="true">{code}</span>;
  }

  return (
    <span className="carrier-logo-shell" aria-hidden="true">
      <img
        className="carrier-logo-img"
        src={`${AIRLINE_LOGO_BASE}/${encodeURIComponent(code)}.png`}
        alt=""
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
});

const StaticFlightIdentity = memo(function StaticFlightIdentity({
  flight,
}: {
  flight: DepartureFlight;
}) {
  return (
    <>
      <AirlineLogo flightId={flight.flightId} />
      <div className="flight-copy flight-static">
        <strong>{flight.flightId}</strong>
        <span>{flight.airline}</span>
      </div>
    </>
  );
});

function RotatingFlightIdentity({
  group,
  rotationStep,
}: {
  group: FlightGroup;
  rotationStep: number;
}) {
  const variant = group.variants[rotationStep % group.variants.length] ?? group.primary;

  return (
    <>
      <AirlineLogo key={`logo-${group.id}-${variant.flightId}`} flightId={variant.flightId} />
      <div
        className="flight-copy flight-rotate"
        key={`copy-${group.id}-${variant.flightId}`}
      >
        <strong>{variant.flightId}</strong>
        <span>{variant.airline}</span>
      </div>
    </>
  );
}

export default function FidsBoard() {
  const [data, setData] = useState<DeparturesPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [terminal, setTerminal] = useState<TerminalFilter>("ALL");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [language, setLanguage] = useState<DisplayLanguage>("KO");
  const [rotationStep, setRotationStep] = useState(0);
  const [departedCache, setDepartedCache] = useState<Record<string, DepartedCacheEntry>>({});

  async function load() {
    try {
      setError("");

      const res = await fetch("/api/departures", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "출발편 정보를 불러오지 못했습니다.");
      }

      setData(json);

      const flights = Array.isArray(json?.flights) ? (json.flights as DepartureFlight[]) : [];
      const observedAt = Date.now();

      setDepartedCache((previous) => {
        const next: Record<string, DepartedCacheEntry> = {};

        // 직전 갱신에서 사라진 출발편도 최초 출발 확인 후 5분까지 유지한다.
        Object.entries(previous).forEach(([key, entry]) => {
          if (observedAt - entry.firstSeenAt < DEPARTED_GRACE_MS) {
            next[key] = entry;
          }
        });

        flights.forEach((flight) => {
          const key = flightRetentionKey(flight);

          if (isDepartedStatus(flight.remark)) {
            next[key] = {
              flight,
              firstSeenAt: next[key]?.firstSeenAt ?? observedAt,
            };
          } else {
            // 운항상태가 다시 수정된 경우 출발 유예 캐시도 즉시 해제한다.
            delete next[key];
          }
        });

        try {
          window.localStorage.setItem(DEPARTED_CACHE_KEY, JSON.stringify(next));
        } catch {
          // 저장소를 사용할 수 없는 환경에서도 메모리 상태만으로 계속 동작한다.
        }

        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "출발편 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DEPARTED_CACHE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, DepartedCacheEntry>;
        const current = Date.now();
        const valid = Object.fromEntries(
          Object.entries(saved).filter(
            ([, entry]) => current - Number(entry?.firstSeenAt ?? 0) < DEPARTED_GRACE_MS
          )
        );
        setDepartedCache(valid);
      }
    } catch {
      // 잘못된/차단된 localStorage는 무시한다.
    }

    load();
    const poll = window.setInterval(load, DATA_POLL_INTERVAL_MS);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    const prune = window.setInterval(() => {
      const current = Date.now();
      setDepartedCache((previous) => {
        const next = Object.fromEntries(
          Object.entries(previous).filter(
            ([, entry]) => current - entry.firstSeenAt < DEPARTED_GRACE_MS
          )
        );

        if (Object.keys(next).length === Object.keys(previous).length) return previous;

        try {
          window.localStorage.setItem(DEPARTED_CACHE_KEY, JSON.stringify(next));
        } catch {
          // localStorage 미사용 환경은 무시한다.
        }
        return next;
      });
    }, 15_000);

    return () => window.clearInterval(prune);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "1") setTerminal("ALL");
      if (event.key === "2") setTerminal("T1");
      if (event.key === "3") setTerminal("T2");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredFlights = useMemo(() => {
    const liveFlights = data?.flights ?? [];
    const current = now?.getTime() ?? Date.now();
    const liveKeys = new Set(liveFlights.map(flightRetentionKey));

    // airport.kr에서 이미 행이 사라졌더라도 브라우저가 "출발"을 확인한 시점부터
    // 5분 동안은 마지막 스냅샷을 보존해 실제 FIDS처럼 출발 상태를 잠시 보여준다.
    const retainedDepartedFlights = Object.entries(departedCache)
      .filter(([, entry]) => current - entry.firstSeenAt < DEPARTED_GRACE_MS)
      .filter(([key]) => !liveKeys.has(key))
      .map(([, entry]) => entry.flight);

    const list = [...liveFlights, ...retainedDepartedFlights];

    return list.filter((flight) => {
      if (isDepartedStatus(flight.remark)) {
        const entry = departedCache[flightRetentionKey(flight)];
        // 방금 응답에서 처음 관측된 출발편은 캐시 state가 반영되기 전에도 표시한다.
        if (entry && current - entry.firstSeenAt >= DEPARTED_GRACE_MS) return false;
      }

      if (terminal === "T1") return terminalGroup(flight) === "T1";
      if (terminal === "T2") return terminalGroup(flight) === "T2";
      return true;
    });
  }, [data, terminal, departedCache, now]);

  const groupedFlights = useMemo(
    () => groupCodeshareFlights(filteredFlights).slice(0, MAX_OPERATIONS),
    [filteredFlights]
  );

  // FIDS 한 화면 운용은 최대 2페이지(15편 × 2 = 30개 실제 운항)로 제한한다.
  // 코드쉐어 행은 groupCodeshareFlights에서 하나의 실제 운항으로 계산된다.
  const totalPages = Math.max(
    1,
    Math.min(MAX_PAGES, Math.ceil(groupedFlights.length / PAGE_SIZE))
  );

  useEffect(() => {
    // 데이터가 60초마다 갱신되어도 현재 페이지 순환은 끊지 않는다.
    // 터미널을 사용자가 바꿨을 때만 1페이지/한국어부터 다시 시작한다.
    setPage(0);
    setLanguage("KO");
    setRotationStep(0);
  }, [terminal]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(0);
      setLanguage("KO");
      setRotationStep(0);
    }
  }, [page, totalPages]);

  const groupsOnPage = useMemo(() => {
    const start = page * PAGE_SIZE;
    return groupedFlights.slice(start, start + PAGE_SIZE);
  }, [groupedFlights, page]);

  // 마지막 페이지도 실제 FIDS처럼 항상 15행 높이를 유지한다.
  // 실제 운항편이 부족한 만큼 빈 행을 채워 각 페이지의 행 크기가 동일하도록 한다.
  const emptyRowCount = Math.max(0, PAGE_SIZE - groupsOnPage.length);

  const maxVariantsOnPage = useMemo(
    () => Math.max(1, ...groupsOnPage.map((group) => group.variants.length)),
    [groupsOnPage]
  );

  // 코드쉐어가 없는 페이지도 한 언어가 너무 빨리 지나가지 않게 최소 6초 유지한다.
  // 코드쉐어가 있으면 현재 페이지의 가장 긴 코드쉐어 묶음이 모두 한 번씩 표시될 때까지
  // 언어를 바꾸지 않는다.
  const stepsPerLanguage = Math.max(MIN_STEPS_PER_LANGUAGE, maxVariantsOnPage);

  useEffect(() => {
    if (loading || error || groupsOnPage.length === 0) return;

    const timer = window.setTimeout(() => {
      if (rotationStep + 1 < stepsPerLanguage) {
        setRotationStep((current) => current + 1);
        return;
      }

      if (language === "KO") {
        setLanguage("EN");
        setRotationStep(0);
        return;
      }

      if (language === "EN") {
        setLanguage("LOCAL");
        setRotationStep(0);
        return;
      }

      setLanguage("KO");
      setRotationStep(0);
      if (totalPages > 1) {
        setPage((current) => (current + 1) % totalPages);
      }
    }, ROTATION_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [
    loading,
    error,
    groupsOnPage.length,
    rotationStep,
    stepsPerLanguage,
    language,
    totalPages,
  ]);

  const selectedTerminal = terminalCopy(terminal);
  const pageDisplay = `${String(Math.min(page + 1, totalPages)).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;

  return (
    <main className="screen-shell">
      <section className="fids-frame">
        <aside className="identity-rail">
          <div className="airport-brand">
            <div className="departure-icon" aria-hidden="true">↗</div>
            <div className="departure-title">
              <strong>출발</strong>
              <span>Departures</span>
            </div>
          </div>

          <button
            className="terminal-selector"
            type="button"
            title="클릭: 전체 → T1 → T2 / 키보드 1·2·3"
            onClick={() => {
              setTerminal((current) => current === "ALL" ? "T1" : current === "T1" ? "T2" : "ALL");
            }}
          >
            <span>{selectedTerminal.ko}</span>
            <strong>{selectedTerminal.en}</strong>
          </button>

          <div className="rail-spacer" />

          <div className="page-number" aria-label={`페이지 ${page + 1} / ${totalPages}`}>
            {pageDisplay}
          </div>

          <div className="rail-time">
            <strong>{now ? formatClock(now) : "--:--"}</strong>
            <span>{now ? formatDate(now) : "--.--"}</span>
          </div>

          <div className="rail-brand">INCHEON AIRPORT</div>
        </aside>

        <section className="information-panel">
          <header className="table-head row-grid">
            <div><b>시간</b><span>Time</span></div>
            <div><b>운항편</b><span>Flight</span></div>
            <div><b>목적지</b><span>Destination</span></div>
            <div><b>체크인</b><span>Counter</span></div>
            <div><b>탑승구</b><span>Gate</span></div>
            <div><b>현황</b><span>Status</span></div>
          </header>

          <div className="rows" key={`${terminal}-${page}`}>
            {loading && (
              <div className="message">출발편 정보를 불러오는 중입니다…</div>
            )}

            {!loading && error && (
              <div className="message error-box">
                <strong>운항정보 연결 오류</strong>
                <span>{error}</span>
                <button onClick={load}>다시 불러오기</button>
              </div>
            )}

            {!loading && !error && groupsOnPage.length === 0 && (
              <div className="message">현재 조회 범위에 표시할 출발편이 없습니다.</div>
            )}

            {!error && groupsOnPage.map((group) => {
              const flight = group.primary;
              const hasCodeshareVariants = group.variants.length > 1;
              const changed = isChanged(flight);
              const groupedTerminal = terminalGroup(flight);
              const status = displayStatus(flight.remark);
              const englishDestination =
                flight.airportEnglish ||
                destinationName(flight.airportCode, flight.airport, "EN");
              const destination =
                language === "KO"
                  ? destinationName(flight.airportCode, flight.airport, "KO")
                  : language === "EN"
                    ? englishDestination
                    : localDestinationName(flight.airportCode, englishDestination);
              const displayedStatus =
                language === "EN" && flight.remarkEnglish
                  ? displayStatus(flight.remarkEnglish)
                  : localizedStatus(status, language, flight.airportCode);
              const contentLang = languageTagForAirport(flight.airportCode, language);
              const contentDirection = directionForAirport(flight.airportCode, language);

              return (
                <article className="flight-row row-grid" key={group.id}>
                  <div className="time-cell">
                    {changed && (
                      <span className="old-time">{hhmm(flight.scheduleDateTime)}</span>
                    )}
                    <strong className={changed ? "changed-time" : ""}>
                      {hhmm(flight.estimatedDateTime || flight.scheduleDateTime)}
                    </strong>
                  </div>

                  <div className="flight-cell">
                    {hasCodeshareVariants ? (
                      <RotatingFlightIdentity group={group} rotationStep={rotationStep} />
                    ) : (
                      <StaticFlightIdentity flight={flight} />
                    )}
                  </div>

                  <div
                    className="destination-cell destination-rotate"
                    key={`${group.id}-${language}`}
                    aria-label={
                      language === "KO"
                        ? "한국어 목적지"
                        : language === "EN"
                          ? "영어 목적지"
                          : "목적지 국가 언어"
                    }
                    lang={contentLang}
                    dir={contentDirection}
                  >
                    <strong>{destination}</strong>
                    <span>{flight.airportCode}</span>
                  </div>

                  <div className="counter-value">{flight.checkin || "-"}</div>

                  <div className="gate-value">
                    <strong>{flight.gate || "-"}</strong>
                    {terminal === "ALL" && <span>{groupedTerminal}</span>}
                  </div>

                  <div className="status-cell">
                    {status ? (
                      <span
                        className={`status-chip status-rotate ${statusClass(status)}`}
                        key={`${group.id}-status-${language}`}
                        lang={contentLang}
                        dir={contentDirection}
                      >
                        {displayedStatus}
                      </span>
                    ) : (
                      <span className="status-empty">-</span>
                    )}
                  </div>
                </article>
              );
            })}

            {!loading && !error && groupsOnPage.length > 0 &&
              Array.from({ length: emptyRowCount }).map((_, index) => (
                <article
                  className="flight-row empty-flight-row row-grid"
                  key={`empty-${page}-${index}`}
                  aria-hidden="true"
                >
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                </article>
              ))}
          </div>

          <footer className="board-footer">
            <div className="footer-source">
              <span
                className={`live-dot ${
                  data?.source === "demo" || data?.source === "passenger_api"
                    ? "demo"
                    : ""
                }`}
              />
              {data?.source === "demo"
                ? "DEMO"
                : data?.source === "passenger_api"
                  ? "OPENAPI FALLBACK"
                  : "AIRPORT.KR LIVE"}
            </div>

            <div className="page-progress" aria-hidden="true">
              {Array.from({ length: totalPages }).map((_, index) => (
                <span key={index} className={index === page ? "active" : ""} />
              ))}
            </div>

            <div className="updated">
              {data?.source === "airport.kr"
                ? "HOMEPAGE FEED + OPENAPI"
                : data
                  ? `${data.query.searchFrom}–${data.query.searchTo}`
                  : "ICN FIDS v0.2"}
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
