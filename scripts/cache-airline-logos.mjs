import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "lib/fids/officialAirlineLogos.ts");
const OUTPUT_DIR = path.join(ROOT, "public/airlines");
const CONCURRENCY = 6;
const TIMEOUT_MS = 30_000;
const WIKI_DELAY_MS = 900;
const WIKIMEDIA_THUMB_WIDTH = 500;
const MAX_SOURCE_ATTEMPTS = 3;
const FALLBACK_BASE = "https://images.kiwi.com/airlines/64";
const REPORT_PATH = path.join(OUTPUT_DIR, "cache-report.json");
const args = process.argv.slice(2);
const forceAll = args.includes("--all");
const requestedCodes = new Set(
  args
    .filter((arg) => !arg.startsWith("--"))
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
);

const registry = await readFile(REGISTRY_PATH, "utf8");
const entries = [...registry.matchAll(
  /^  ("?)([A-Z0-9]{2})\1: \{\n    url: "([^"]+)",\n    sourceUrl: "([^"]+)",/gm
)].map((match) => ({
  code: match[2],
  localUrl: match[3],
  sourceUrl: match[4],
}));

if (!entries.length) throw new Error("No airline logo entries found.");
await mkdir(OUTPUT_DIR, { recursive: true });

const entryByCode = new Map(entries.map((entry) => [entry.code, entry]));
const unknownCodes = [...requestedCodes].filter((code) => !entryByCode.has(code));
if (unknownCodes.length) {
  throw new Error(`Unknown airline logo codes: ${unknownCodes.join(", ")}`);
}

async function readPreviousReport() {
  try {
    return JSON.parse(await readFile(REPORT_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const previousReport = await readPreviousReport();
const previousResults = new Map(
  Array.isArray(previousReport?.results)
    ? previousReport.results.map((result) => [result.code, result])
    : []
);

const selectedEntries = [];
for (const entry of entries) {
  const target = path.join(ROOT, "public", entry.localUrl.replace(/^\//, ""));
  const previous = previousResults.get(entry.code);
  const explicitlyRequested = requestedCodes.has(entry.code);
  const needsRefresh =
    forceAll ||
    explicitlyRequested ||
    !(await exists(target)) ||
    previous?.sourceUrl !== entry.sourceUrl ||
    previous?.mode !== "source";

  if (needsRefresh) selectedEntries.push(entry);
}

if (!selectedEntries.length) {
  console.log(`[airline-logo] ${entries.length} committed assets are up to date; nothing to download`);
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let wikiQueue = Promise.resolve();

function wikimediaThumbnailUrl(filename) {
  const query = new URLSearchParams({
    title: `Special:Redirect/file/${filename}`,
    width: String(WIKIMEDIA_THUMB_WIDTH),
  });
  return `https://commons.wikimedia.org/w/index.php?${query.toString()}`;
}

function normalizeSourceUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const redirectPrefix = "/wiki/Special:Redirect/file/";

    if (url.hostname === "commons.wikimedia.org" && url.pathname.startsWith(redirectPrefix)) {
      const filename = decodeURIComponent(url.pathname.slice(redirectPrefix.length));
      return wikimediaThumbnailUrl(filename);
    }

    if (
      url.hostname === "upload.wikimedia.org" &&
      url.pathname.startsWith("/wikipedia/commons/")
    ) {
      const filename = decodeURIComponent(url.pathname.split("/").pop() || "");
      if (filename) return wikimediaThumbnailUrl(filename);
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function isWiki(url) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("wikimedia.org") || host.endsWith("wikinews.org");
  } catch {
    return false;
  }
}

async function fetchBytes(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "KoreaAirportFIDS/1.0 (static asset cache; contact: repository maintainer)",
        accept: "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      const error = new Error(`${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error("empty response");
    const responseContentType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0];
    const prefix = bytes.subarray(0, 256).toString("utf8").trimStart().toLowerCase();
    if (
      responseContentType === "text/html" ||
      responseContentType === "application/xhtml+xml" ||
      prefix.startsWith("<!doctype html") ||
      prefix.startsWith("<html")
    ) {
      throw new Error(`unexpected HTML response (${responseContentType})`);
    }
    const contentType = prefix.startsWith("<svg") || prefix.includes("<svg ")
      ? "image/svg+xml"
      : responseContentType;
    return {
      bytes,
      contentType,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(entry) {
  const attempt = async () => {
    let lastError;
    for (let i = 0; i < MAX_SOURCE_ATTEMPTS; i++) {
      try {
        return await fetchBytes(normalizeSourceUrl(entry.sourceUrl));
      } catch (error) {
        lastError = error;
        const status = error && typeof error === "object" ? error.status : undefined;
        if (typeof status === "number" && status !== 429 && status < 500) break;
        await sleep(1200 * (i + 1));
      }
    }
    throw lastError;
  };

  if (!isWiki(entry.sourceUrl)) return attempt();

  const queued = wikiQueue.then(async () => {
    await sleep(WIKI_DELAY_MS);
    return attempt();
  });
  wikiQueue = queued.catch(() => undefined);
  return queued;
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[char]);
}

function wrapAsset(bytes, contentType, label) {
  const mime = contentType.includes("svg") ? "image/svg+xml" :
    contentType.includes("png") ? "image/png" :
    contentType.includes("webp") ? "image/webp" :
    contentType.includes("jpeg") || contentType.includes("jpg") ? "image/jpeg" :
    "application/octet-stream";
  const base64 = bytes.toString("base64");
  // Lao Airlines places its flower at the far right of a long decorative line.
  // Center the flower in the shared ICN/KAC logo frame and preserve this crop on refresh.
  const zoom = label === "QV" ? 2 : 1;
  const x = label === "QV" ? -1100 : 0;
  const y = label === "QV" ? -150 : 0;
  const viewBoxWidth = label === "QV" ? 600 : 1000;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} 300" role="img" aria-label="${escapeXml(label)}"><image href="data:${mime};base64,${base64}" x="${x}" y="${y}" width="${1000 * zoom}" height="${300 * zoom}" preserveAspectRatio="xMidYMid meet"/></svg>\n`;
}

function textFallback(code) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" role="img" aria-label="${code}"><rect width="1000" height="300" fill="#f4f5f7"/><text x="500" y="185" text-anchor="middle" font-family="Arial,sans-serif" font-size="150" font-weight="700" fill="#111827">${code}</text></svg>\n`;
}

async function cache(entry) {
  const target = path.join(ROOT, "public", entry.localUrl.replace(/^\//, ""));
  await mkdir(path.dirname(target), { recursive: true });

  try {
    const source = await fetchSource(entry);
    await writeFile(target, wrapAsset(source.bytes, source.contentType, entry.code), "utf8");
    return { code: entry.code, mode: "source", sourceUrl: entry.sourceUrl };
  } catch (sourceError) {
    const fallbackUrl = `${FALLBACK_BASE}/${encodeURIComponent(entry.code)}.png`;
    try {
      const fallback = await fetchBytes(fallbackUrl);
      await writeFile(target, wrapAsset(fallback.bytes, fallback.contentType, entry.code), "utf8");
      return {
        code: entry.code,
        mode: "kiwi-fallback",
        sourceUrl: entry.sourceUrl,
        error: sourceError instanceof Error ? sourceError.message : String(sourceError),
      };
    } catch (fallbackError) {
      await writeFile(target, textFallback(entry.code), "utf8");
      return {
        code: entry.code,
        mode: "text-fallback",
        sourceUrl: entry.sourceUrl,
        error: sourceError instanceof Error ? sourceError.message : String(sourceError),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      };
    }
  }
}

let cursor = 0;
const results = [];

async function worker() {
  while (cursor < selectedEntries.length) {
    const entry = selectedEntries[cursor++];
    const result = await cache(entry);
    results.push(result);
    console.log(`[airline-logo] ${entry.code}: ${result.mode}`);
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, selectedEntries.length) }, () => worker())
);

const updatedResults = new Map(results.map((result) => [result.code, result]));
const completeResults = entries.map((entry) =>
  updatedResults.get(entry.code) || previousResults.get(entry.code) || {
    code: entry.code,
    mode: "missing",
    sourceUrl: entry.sourceUrl,
  }
).sort((a, b) => a.code.localeCompare(b.code));
const report = {
  total: entries.length,
  source: completeResults.filter((item) => item.mode === "source").length,
  kiwiFallback: completeResults.filter((item) => item.mode === "kiwi-fallback").length,
  textFallback: completeResults.filter((item) => item.mode === "text-fallback").length,
  updated: selectedEntries.length,
  skipped: entries.length - selectedEntries.length,
  results: completeResults,
  generatedAt: new Date().toISOString(),
};

await writeFile(
  REPORT_PATH,
  JSON.stringify(report, null, 2) + "\n",
  "utf8"
);

console.log(
  `[airline-logo] updated ${report.updated}/${report.total} committed assets (source=${report.source}, kiwi=${report.kiwiFallback}, text=${report.textFallback}, skipped=${report.skipped})`
);
