import { describe, it, expect } from "vitest";
import { exportWith, byName, section } from "./helpers.js";

describe("functions", () => {
  it("encodes generate_embedding function with multimodal inputs", () => {
    const payload = exportWith({});
    const fn = byName(section(payload, "function"), "vector/generate_embedding");
    expect(fn).toBeDefined();
    expect(fn.input.some((i: any) => i.name === "text")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "media_data")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "mime_type")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "model")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "api_key")).toBe(true);
    expect(fn.run.some((s: any) => s.name === "mvp:api_request")).toBe(true);
  });

  it("encodes chunk_text function", () => {
    const payload = exportWith({});
    const fn = byName(section(payload, "function"), "vector/chunk_text");
    expect(fn).toBeDefined();
    expect(fn.input.some((i: any) => i.name === "content")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "strategy")).toBe(true);
    expect(fn.run.some((s: any) => s.name === "mvp:lambda")).toBe(true);
  });

  it("encodes ingest_document function", () => {
    const payload = exportWith({});
    const fn = byName(section(payload, "function"), "vector/ingest_document");
    expect(fn).toBeDefined();
    expect(fn.input.some((i: any) => i.name === "document_id")).toBe(true);
    expect(fn.run.some((s: any) => s.name === "mvp:dbo_getby")).toBe(true);
  });

  it("encodes search_vectors function with multimodal query support", () => {
    const payload = exportWith({});
    const fn = byName(section(payload, "function"), "vector/search_vectors");
    expect(fn).toBeDefined();
    expect(fn.input.some((i: any) => i.name === "query")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "query_media_data")).toBe(true);
    expect(fn.input.some((i: any) => i.name === "query_embedding")).toBe(true);
    expect(fn.run.some((s: any) => s.name === "mvp:dbo_view")).toBe(true);
  });
});
