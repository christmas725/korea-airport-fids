import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const registry = await readFile(path.join(root, "lib/fids/officialAirlineLogos.ts"), "utf8");
const entries = [...registry.matchAll(
  /^  ("?)([A-Z0-9]{2})\1: \{\n    url: "([^"]+)",\n    sourceUrl: "([^"]+)",/gm
)].map((match) => ({
  code: match[2],
  localUrl: match[3],
  sourceUrl: match[4],
}));

assert.ok(entries.length > 0, "airline logo registry is empty");

const reportPath = path.join(root, "public/airlines/cache-report.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));
const reportByCode = new Map(report.results.map((result) => [result.code, result]));

assert.equal(report.total, entries.length, "registry and cache report counts differ");
assert.equal(report.results.length, entries.length, "cache report result count differs");
assert.equal(report.source, entries.length, "registered logo is not using its source asset");
assert.equal(report.kiwiFallback, 0, "registered logo is using the external fallback");
assert.equal(report.textFallback, 0, "text fallback logo found");

for (const entry of entries) {
  const assetPath = path.join(root, "public", entry.localUrl.replace(/^\//, ""));
  await access(assetPath);
  const asset = await readFile(assetPath, "utf8");
  assert.match(asset, /^<svg\b/, `${entry.code}: cached asset is not SVG`);
  assert.match(asset, new RegExp(`viewBox="0 0 ${entry.code === "QV" ? 600 : 1000} 300"`), `${entry.code}: cached frame changed`);

  const cached = reportByCode.get(entry.code);
  assert.ok(cached, `${entry.code}: missing cache report entry`);
  assert.equal(cached.sourceUrl, entry.sourceUrl, `${entry.code}: source URL changed without refresh`);
  assert.equal(cached.mode, "source", `${entry.code}: registered logo is not a source asset`);
}

console.log(`${entries.length} committed airline logo assets passed integrity checks`);
