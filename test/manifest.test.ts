import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { Xano, workspaceConfig } from "@xano/sdk";
import * as vector from "../src/index.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  xanosdk: { register: string; returns: string; options: Record<string, unknown> };
};

describe('package.json "xanosdk" block', () => {
  it("names a real register export that takes only the workspace as a required argument", () => {
    const register = (vector as Record<string, unknown>)[pkg.xanosdk.register];
    expect(typeof register).toBe("function");
    expect((register as (...a: unknown[]) => unknown).length).toBe(1);
  });

  it('declares `options: {}` and `returns: "handle"`, and a bare call mutates the workspace and returns a handle', () => {
    expect(pkg.xanosdk.options).toEqual({});
    expect(pkg.xanosdk.returns).toBe("handle");
    const xano = new Xano().registerWorkspace(workspaceConfig({ name: "t", env: { GEMINI_API_KEY: "" } }));
    const handle = vector.registerVector(xano);
    expect(handle.xano).toBe(xano);
    expect((xano.export() as any).payload.tool).toHaveLength(1);
  });
});
