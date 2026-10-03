import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const repoRoot = new URL("../", import.meta.url);

const packedFiles = (): string[] => {
  const stdout = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: fileURLToPath(repoRoot),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const json = stdout.slice(stdout.indexOf("["));
  return (JSON.parse(json)[0].files as { path: string }[]).map((f) => f.path);
};

const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

const relativeLinksIn = (file: string): string[] =>
  [...readFileSync(new URL(file, repoRoot), "utf8").matchAll(LINK)]
    .flatMap((m) => {
      const target = m[1] ?? "";
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) return [];
      const [path] = target.split("#");
      return path ? [path] : [];
    });

describe("published docs", () => {
  it("publishes exactly the intended non-dist files", () => {
    const shipped = packedFiles();
    expect(shipped.filter((f) => !f.startsWith("dist/")).sort()).toEqual([
      "AGENTS.md",
      "LICENSE",
      "README.md",
      "llms.txt",
      "package.json",
    ]);
    expect(shipped.filter((f) => f.endsWith(".map"))).toEqual([]);
  }, 60_000);

  it("resolves every relative link in a shipped doc inside the tarball", () => {
    const shipped = packedFiles();
    const docs = shipped.filter((f) => /\.(md|txt)$/.test(f));
    expect(docs.length).toBeGreaterThan(0);

    const dead = docs.flatMap((doc) =>
      relativeLinksIn(doc)
        .map((target) => ({
          doc,
          target,
          resolved: new URL(target, new URL(doc, "file:///")).pathname.slice(1),
        }))
        .filter(({ resolved }) => !shipped.includes(resolved))
        .map(({ doc, target }) => `${doc} → ${target}`),
    );

    expect(dead).toEqual([]);
  }, 60_000);
});
