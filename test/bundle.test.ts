import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  GOLDEN_FIXTURE_URL,
  buildGoldenBundle,
  serializeGoldenBundle,
} from "./golden.js";

const fixture = () => JSON.parse(readFileSync(GOLDEN_FIXTURE_URL, "utf8"));

describe("golden bundle", () => {
  it("matches the committed fixture byte for byte", () => {
    expect(buildGoldenBundle()).toEqual(fixture());
  });

  it("serializes to exactly the committed bytes", () => {
    expect(serializeGoldenBundle(buildGoldenBundle())).toBe(readFileSync(GOLDEN_FIXTURE_URL, "utf8"));
  });

  it("is deterministic across builds in one process", () => {
    expect(buildGoldenBundle()).toEqual(buildGoldenBundle());
  });
});

describe("what the fixture actually covers", () => {
  const payload = () => fixture().payload;

  it("covers all 7 endpoint queries", () => {
    expect(payload().query).toHaveLength(7);
  });

  it("covers both tables", () => {
    expect(payload().dbo.some((t: any) => t.name === "vec_document")).toBe(true);
    expect(payload().dbo.some((t: any) => t.name === "vec_chunk")).toBe(true);
  });

  it("covers the 768-dim vector column and vector cosine index", () => {
    const chunk = payload().dbo.find((t: any) => t.name === "vec_chunk");
    const embedding = chunk.schema.find((c: any) => c.name === "embedding");
    expect(embedding.type).toBe("vector");
    expect(embedding.vector.size).toBe(768);

    const vectorIdx = chunk.index.find((idx: any) => idx.type === "vector");
    expect(vectorIdx).toBeDefined();
    expect(vectorIdx.fields[0].op).toBe("vector_cosine_ops");
  });

  it("covers the 4 pipeline functions", () => {
    expect(payload().function).toHaveLength(4);
  });

  it("covers the agent search tool", () => {
    expect(payload().tool.some((t: any) => t.name === "vector_search")).toBe(true);
  });
});
