import assert from "node:assert/strict";
import { airports } from "../lib/airports.ts";
import { OFFICIAL_AIRLINE_LOGOS } from "../lib/fids/officialAirlineLogos.ts";

const baseUrl = (process.env.FIDS_AUDIT_BASE_URL || "https://korea-airport-fids.vercel.app").replace(/\/$/, "");
const auditCookie = process.env.FIDS_AUDIT_COOKIE || "";
const timeoutMs = 45_000;
const maxFetchAttempts = 3;

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
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxFetchAttempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "user-agent": "KoreaAirportFIDS/1.0 live data quality audit",
          ...(auditCookie ? { cookie: auditCookie } : {}),
        },
      });
      if (!response.ok && (response.status === 429 || response.status >= 500) && attempt < maxFetchAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
        continue;
      }
      assert.equal(response.ok, true, `${path}: HTTP ${response.status}`);
      return { response, body: await response.json() as Record<string, unknown> };
    } catch (error) {
      lastError = error;
      if (attempt < maxFetchAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${path}: failed after ${maxFetchAttempts} attempts (${message})`, { cause: lastError });
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
