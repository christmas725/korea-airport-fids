export type FidsTestScenario =
  | "normal"
  | "busy"
  | "gate-change"
  | "status"
  | "layout"
  | "paging"
  | "overnight";

const SCENARIOS = new Set<FidsTestScenario>([
  "normal",
  "busy",
  "gate-change",
  "status",
  "layout",
  "paging",
  "overnight",
]);

export function previewTestAllowed() {
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development";
}

export function readPreviewTest(searchParams: URLSearchParams) {
  const raw = (searchParams.get("test") || "").trim().toLowerCase();
  if (!SCENARIOS.has(raw as FidsTestScenario)) return null;

  const time = (searchParams.get("time") || "").replace(/\D/g, "").slice(0, 4);
  return {
    scenario: raw as FidsTestScenario,
    time: /^([01]\d|2[0-3])[0-5]\d$/.test(time) ? time : "",
  };
}

export function testBaseDate(hhmm = "", now = new Date()) {
  if (!hhmm) return now;

  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));
  return new Date(Date.UTC(y, m, d, hh - 9, mm));
}
