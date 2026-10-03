import { describe, it, expect } from "vitest";
import { Xano } from "@xano/sdk";
import { createVector, registerVector } from "../src/index.js";

describe("registerVector and createVector", () => {
  it("createVector builds all defs without registering", () => {
    const vec = createVector({});
    expect(vec.document).toBeDefined();
    expect(vec.chunk).toBeDefined();
    expect(vec.embedFn).toBeDefined();
    expect(vec.chunkFn).toBeDefined();
    expect(vec.ingestFn).toBeDefined();
    expect(vec.searchFn).toBeDefined();
    expect(vec.searchTool).toBeDefined();
    expect(vec.group).toBeDefined();
    expect(vec.documents.all).toHaveLength(5);
    expect(vec.search.all).toHaveLength(2);
    expect(vec.queries).toHaveLength(7);
  });

  it("registerVector registers all defs and returns handle with xano", () => {
    const xano = new Xano().registerWorkspace({ name: "test-workspace" });
    const vec = registerVector(xano, {});

    expect(vec.xano).toBe(xano);
    const bundle = xano.export() as any;
    expect(bundle.payload.dbo).toHaveLength(2);
    expect(bundle.payload.function).toHaveLength(4);
    expect(bundle.payload.tool).toHaveLength(1);
    expect(bundle.payload.app).toHaveLength(1);
    expect(bundle.payload.query).toHaveLength(7);
  });

  it("throws on duplicate registration on the same instance", () => {
    const xano = new Xano().registerWorkspace({ name: "test-workspace-dup" });
    registerVector(xano, {});
    expect(() => registerVector(xano, {})).toThrow("already called on this Xano instance");
  });
});
