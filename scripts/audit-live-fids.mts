import assert from "node:assert/strict";
import { airports } from "../lib/airports.ts";
import { OFFICIAL_AIRLINE_LOGOS } from "../lib/fids/officialAirlineLogos.ts";

const baseUrl = (process.env.FIDS_AUDIT_BASE_URL || "https://korea-airport-fids.vercel.app").replace(/\/$/, "");
const timeoutMs = 20_000;

type Flight = {
  airport?: string;
  airportCode?: string;
  flightId?: string;
};

type AuditRow = {
  airport: string;
  mode: "departures" | "arrivals";
  status: number;
  flights: Flight[];
};

function airlineCode(flightId = "") {
  return flightId.replace(/\s+/g, "").toUpperCase().match(/^([A-Z0-9]{2})/)?.[1] ?? "";
}

async function fetchJson(path: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "KoreaAirportFIDS/1.0 live data quality audit" },
  });
  assert.equal(response.ok, true, `${path}: HTTP ${response.status}`);
  return { response, body: await response.json() as Record<string, unknown> };
}

const rows: AuditRow[] = [];
for (const airport of airports) {
  const modes: Array<"departures" | "arrivals"> = airport.source === "icn"
    ? ["departures"]
    : ["departures", "arrivals"];

  for (const mode of modes) {
    const query = airport.source === "icn" ? "view=board" : `mode=${mode}`;
    const { response, body } = await fetchJson(`/api/airports/${airport.code.toLowerCase()}/flights?${query}`);
    const flights = (body.flights || body.departures || []) as Flight[];
    rows.push({ airport: airport.code, mode, status: response.status, flights });
  }
}

const flights = rows.flatMap((row) => row.flights.map((flight) => ({ ...flight, row })));
const blankDestinations = flights.filter(({ airport }) => !String(airport || "").trim() || airport === "-");
const codeOnlyDestinations = flights.filter(({ airport, airportCode }) => {
  const label = String(airport || "").trim().toUpperCase();
  const code = String(airportCode || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(label) || (code && label === code);
});
const activeAirlineCodes = [...new Set(flights.map(({ flightId }) => airlineCode(flightId)).filter(Boolean))].sort();
const missingLogos = activeAirlineCodes.filter((code) => !OFFICIAL_AIRLINE_LOGOS[code]);

const cache = await fetchJson("/airlines/cache-report.json");
const cacheBody = cache.body as {
  total?: number;
  textFallback?: number;
  results?: Array<{ code: string; mode: string }>;
};
const nonSourceLogos = (cacheBody.results || []).filter(({ mode }) => mode !== "source");

const summary = {
  baseUrl,
  endpoints: rows.length,
  flights: flights.length,
  activeAirlineCodes: activeAirlineCodes.length,
  registeredLogos: Object.keys(OFFICIAL_AIRLINE_LOGOS).length,
  cachedLogos: cacheBody.total || 0,
  blankDestinations: blankDestinations.length,
  codeOnlyDestinations: codeOnlyDestinations.length,
  missingLogos,
  nonSourceLogos,
};

console.log(JSON.stringify(summary, null, 2));
assert.equal(blankDestinations.length, 0, "blank destination labels found");
assert.equal(codeOnlyDestinations.length, 0, "airport-code-only destination labels found");
assert.deepEqual(missingLogos, [], "active airline codes without registered horizontal logos");
assert.equal(cacheBody.total || 0, Object.keys(OFFICIAL_AIRLINE_LOGOS).length, "registered and cached logo counts differ");
assert.equal(nonSourceLogos.length, 0, "cached airline logos using fallback assets found");
assert.equal(cacheBody.textFallback || 0, 0, "text-only cached airline logos found");
