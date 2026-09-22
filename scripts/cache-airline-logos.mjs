import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "lib/fids/officialAirlineLogos.ts");
const OUTPUT_DIR = path.join(ROOT, "public/airlines");
const CONCURRENCY = 10;
const TIMEOUT_MS = 15_000;

const registry = await readFile(REGISTRY_PATH, "utf8");
const entries = [...registry.matchAll(
  /^  ("?)([A-Z0-9]{2})\1: \{\n    url: "([^"]+)",\n    sourceUrl: "([^"]+)",/gm
)].map((match) => ({
  code: match[2],
  localUrl: match[3],
  sourceUrl: match[4],
}));

if (!entries.length) {
  throw new Error("No airline logo entries found.");
}

await mkdir(OUTPUT_DIR, { recursive: true });

async function download(entry) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(entry.sourceUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; KoreaAirportFIDS/1.0)",
        accept: "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error("empty response");
    const target = path.join(ROOT, "public", entry.localUrl.replace(/^\//, ""));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    return { code: entry.code, bytes: buffer.length };
  } finally {
    clearTimeout(timer);
  }
}

const failures = [];
let cursor = 0;
let completed = 0;

async function worker() {
  while (cursor < entries.length) {
    const index = cursor++;
    const entry = entries[index];
    try {
      const result = await download(entry);
      completed++;
      console.log(`[airline-logo] ${result.code}: ${result.bytes} bytes`);
    } catch (error) {
      failures.push({
        code: entry.code,
        url: entry.sourceUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[airline-logo] ${entry.code}: failed - ${failures.at(-1).error}`);
    }
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker())
);

const report = {
  total: entries.length,
  cached: completed,
  failed: failures.length,
  failures,
  generatedAt: new Date().toISOString(),
};

await writeFile(
  path.join(OUTPUT_DIR, "cache-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8"
);

console.log(`[airline-logo] cached ${completed}/${entries.length}`);
if (failures.length) {
  console.warn(`[airline-logo] ${failures.length} source(s) failed; see /airlines/cache-report.json`);
}
