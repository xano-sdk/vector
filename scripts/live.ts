// `npm run test:live`: deploy test/live/index.ts, store chunks with known vectors, and search them over real HTTP.
// Set GEMINI_API_KEY to also ingest a document and search it by text, which call Gemini for real. Runs from .live/,
// a throwaway project, so the CLI's engine pin and lock never touch this package's package.json. Exits non-zero on
// a failure.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, ".live");
const entry = resolve(root, "test/live/index.ts");
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "package.json"), JSON.stringify({ name: "live-fixture", private: true }) + "\n");
const bin = resolve(root, "node_modules/.bin/xanosdk");
const geminiKey = process.env.GEMINI_API_KEY;
// The key goes in a private file, not an argument, so a failed deploy cannot print it.
const envFile = resolve(dir, "backend.env");
writeFileSync(envFile, `GEMINI_API_KEY=${geminiKey ?? "not-used-by-this-check"}\n`, { mode: 0o600 });
let out: string;
try {
  out = execFileSync(bin, ["deploy", entry, "--no-lock", "--backend-env-file", envFile, "--yes", "--json"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
} finally {
  rmSync(envFile, { force: true });
}
const deployed = JSON.parse(out.slice(out.indexOf("{"))) as { url: string };
const base = deployed.url.replace(/\/+$/, "");

const post = async (path: string, body: unknown) => {
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, body: (await res.json().catch(() => null)) as { results?: { content?: string }[]; count?: number } | null };
};

/** A 768-dim vector along one axis, leaning `lean` towards the next. */
const axis = (i: number, lean = 0) => Array.from({ length: 768 }, (_, n) => (n === i ? 1 : n === i + 1 ? lean : 0));

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: unknown) => results.push({ name, ok, ...(ok ? {} : { detail: JSON.stringify(detail) }) });

const run = Date.now().toString(36);
const [north, near, south] = [`north-${run}`, `near-${run}`, `south-${run}`];
const seeded = [await post("/api:live/live/seed", { title: south, embedding: axis(9) }), await post("/api:live/live/seed", { title: near, embedding: axis(0, 1) }), await post("/api:live/live/seed", { title: north, embedding: axis(0) })];
check("chunks with vectors can be stored", seeded.every((r) => r.status === 200), seeded);

const search = (body: Record<string, unknown>) => post("/api:vector/vector/search", { limit: 5, threshold: 0, ...body });
const found = await search({ query_embedding: axis(0) });
const order = (found.body?.results ?? []).map((r) => r.content);
check("search answers", found.status === 200, found);
check("the closest vector comes first", order[0] === north, order);
check("results run from closest to furthest", order.indexOf(north) < order.indexOf(near) && order.indexOf(near) !== -1, order);
const limited = await search({ query_embedding: axis(0), limit: 1 });
check("limit caps the results", limited.body?.results?.length === 1, limited);

const strict = await search({ query_embedding: axis(0), threshold: 0.99 });
check("a high threshold keeps only the exact match", strict.body?.results?.length === 1 && strict.body.results[0]?.content === north && strict.body.count === 1, strict.body?.count);
const middle = (await search({ query_embedding: axis(0), threshold: 0.5 })).body?.results?.map((r) => r.content);
check("a middle threshold keeps the near match and drops the far one", middle?.includes(near) === true && !middle.includes(south), middle);
const none = await search({ query_embedding: axis(50), threshold: 0.5 });
check("nothing above the threshold returns an empty list", none.status === 200 && none.body?.results?.length === 0 && none.body.count === 0, none.body?.count);

if (geminiKey) {
  const ingested = await post("/api:vector/vector/documents/create", { title: `whales-${run}`, content: "# Blue whales\n\nThe blue whale is the largest animal ever known. It feeds on krill in cold oceans." });
  check("a document ingests through Gemini", ingested.status === 200 && (ingested.body as { status?: string } | null)?.status === "indexed", ingested.body);
  const asked = await search({ query: "What is the biggest creature on earth?", threshold: 0.3 });
  check("a text question finds the document", asked.status === 200 && asked.body?.results?.[0]?.content?.includes("blue whale") === true, asked.body?.results?.map((r) => r.content?.slice(0, 40)));
} else {
  console.log("- no GEMINI_API_KEY: ingest and text search were not run");
}

for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.detail ? `: ${r.detail.slice(0, 300)}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
