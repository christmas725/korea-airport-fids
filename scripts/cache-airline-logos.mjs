import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "lib/fids/officialAirlineLogos.ts");
const OUTPUT_DIR = path.join(ROOT, "public/airlines");
const CONCURRENCY = 6;
const TIMEOUT_MS = 15_000;
const WIKI_DELAY_MS = 1500;
const MAX_SOURCE_ATTEMPTS = 2;
const FALLBACK_BASE = "https://images.kiwi.com/airlines/64";

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let wikiQueue = Promise.resolve();

function normalizeSourceUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== "commons.wikimedia.org") return rawUrl;
    const prefix = "/wiki/Special:Redirect/file/";
    if (!url.pathname.startsWith(prefix)) return rawUrl;

    const filename = decodeURIComponent(url.pathname.slice(prefix.length));
    const hash = createHash("md5").update(filename).digest("hex");
    const encoded = encodeURIComponent(filename).replace(/%2F/g, "/");

    return `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encoded}`;
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
    return {
      bytes,
      contentType: (response.headers.get("content-type") || "application/octet-stream").split(";")[0],
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
        if (status !== 429 && !(typeof status === "number" && status >= 500)) break;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" role="img" aria-label="${escapeXml(label)}"><image href="data:${mime};base64,${base64}" x="0" y="0" width="1000" height="300" preserveAspectRatio="xMidYMid meet"/></svg>\n`;
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
  while (cursor < entries.length) {
    const entry = entries[cursor++];
    const result = await cache(entry);
    results.push(result);
    console.log(`[airline-logo] ${entry.code}: ${result.mode}`);
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker())
);

results.sort((a, b) => a.code.localeCompare(b.code));
const report = {
  total: entries.length,
  source: results.filter((item) => item.mode === "source").length,
  kiwiFallback: results.filter((item) => item.mode === "kiwi-fallback").length,
  textFallback: results.filter((item) => item.mode === "text-fallback").length,
  results,
  generatedAt: new Date().toISOString(),
};

await writeFile(
  path.join(OUTPUT_DIR, "cache-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8"
);

console.log(
  `[airline-logo] generated ${report.total} local assets (source=${report.source}, kiwi=${report.kiwiFallback}, text=${report.textFallback})`
);
