import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const configPath = path.join(root, "sync", "airport-sources.json");
const checkOnly = process.argv.includes("--check");
const token = process.env.GITHUB_TOKEN?.trim();

function requestHeaders(accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    "User-Agent": "korea-airport-fids-source-sync",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: requestHeaders(accept),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`${url} 요청 실패: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function latestCommit(repository, branch) {
  const body = await fetchText(
    `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(branch)}`
  );
  const commit = JSON.parse(body);
  if (!/^[0-9a-f]{40}$/i.test(commit.sha ?? "")) {
    throw new Error(`${repository}@${branch}의 최신 커밋을 확인하지 못했습니다.`);
  }
  return commit.sha;
}

async function sourceFile(repository, commit, sourcePath) {
  const encodedPath = sourcePath.split("/").map(encodeURIComponent).join("/");
  return fetchText(
    `https://raw.githubusercontent.com/${repository}/${commit}/${encodedPath}`,
    "text/plain"
  );
}

function namespaceImports(content, airportId) {
  return content.replaceAll("@/lib/", `@/lib/${airportId}/`);
}

function transformSource(content, source, mapping) {
  let transformed = content;

  if (mapping.transform !== "copy") {
    transformed = namespaceImports(transformed, source.id);
  }

  if (mapping.transform === "icn-component") {
    if (!transformed.includes("/api/departures")) {
      throw new Error(`${source.repository}:${mapping.from}에서 ICN API 경로를 찾지 못했습니다.`);
    }
    transformed = transformed.replaceAll("/api/departures", "/api/airports/icn/flights");
  }

  if (mapping.transform === "tae-component") {
    if (!transformed.includes("/api/flights")) {
      throw new Error(`${source.repository}:${mapping.from}에서 TAE API 경로를 찾지 못했습니다.`);
    }
    transformed = transformed.replaceAll("/api/flights", "/api/airports/tae/flights");
  }

  return transformed.endsWith("\n") ? transformed : `${transformed}\n`;
}

function targetPath(relativePath) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`허용되지 않은 대상 경로입니다: ${relativePath}`);
  }
  return resolved;
}

if (process.argv.includes("--self-test")) {
  assert.equal(
    transformSource(
      'import type { DepartureFlight } from "@/lib/types";\nfetch("/api/departures");\n',
      { id: "icn", repository: "test/icn" },
      { from: "components/FidsBoard.tsx", transform: "icn-component" }
    ),
    'import type { DepartureFlight } from "@/lib/icn/types";\nfetch("/api/airports/icn/flights");\n'
  );
  assert.equal(
    transformSource(
      'import type { FidsFlight } from "@/lib/types";\nfetch(`/api/flights?mode=${mode}`);\n',
      { id: "tae", repository: "test/tae" },
      { from: "components/FidsBoard.tsx", transform: "tae-component" }
    ),
    'import type { FidsFlight } from "@/lib/tae/types";\nfetch(`/api/airports/tae/flights?mode=${mode}`);\n'
  );
  assert.throws(() => targetPath("../outside.txt"), /허용되지 않은 대상 경로/);
  console.log("공항 소스 경로 변환 자체 검증을 통과했습니다.");
  process.exit(0);
}

async function existingFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function sameContent(current, next) {
  if (current === null) return false;
  return current.replace(/\n+$/, "\n") === next.replace(/\n+$/, "\n");
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const changedFiles = [];
const changedSources = [];

for (const source of config.sources) {
  const commit = await latestCommit(source.repository, source.branch);
  if (commit !== source.lastSyncedCommit) changedSources.push(source.id.toUpperCase());

  const upstreamFiles = await Promise.all(
    source.mappings.map((mapping) =>
      sourceFile(source.repository, commit, mapping.from)
    )
  );

  for (const [index, mapping] of source.mappings.entries()) {
    const upstream = upstreamFiles[index];
    const next = transformSource(upstream, source, mapping);
    const destination = targetPath(mapping.to);
    const current = await existingFile(destination);

    if (sameContent(current, next)) continue;
    changedFiles.push(mapping.to);

    if (!checkOnly) {
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, next, "utf8");
    }
  }

  source.lastSyncedCommit = commit;
}

const nextConfig = `${JSON.stringify(config, null, 2)}\n`;
const currentConfig = await readFile(configPath, "utf8");
if (currentConfig !== nextConfig) {
  changedFiles.push(path.relative(root, configPath));
  if (!checkOnly) await writeFile(configPath, nextConfig, "utf8");
}

const uniqueFiles = [...new Set(changedFiles)].sort();
if (uniqueFiles.length === 0) {
  console.log("인천·대구 FIDS 소스가 이미 최신 상태입니다.");
  process.exit(0);
}

console.log(`${changedSources.join(", ") || "공항"} 소스 변경을 확인했습니다.`);
console.log(uniqueFiles.map((file) => `- ${file}`).join("\n"));

if (checkOnly) {
  console.error("통합 FIDS에 반영되지 않은 변경이 있습니다.");
  process.exit(1);
}
