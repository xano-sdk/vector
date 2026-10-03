import { describe, it, expect } from "vitest";
import { exportWith, byName, section } from "./helpers.js";

describe("agent vector search tool", () => {
  it("encodes the vector search tool definition", () => {
    const payload = exportWith({});
    const tools = section(payload, "tool");
    const searchTool = byName(tools, "vector_search");

    expect(searchTool).toBeDefined();
    expect(searchTool.description).toContain("vector similarity");
    expect(searchTool.instructions).toContain("retrieve facts");
    expect(searchTool.input.some((i: any) => i.name === "query")).toBe(true);
    expect(searchTool.input.some((i: any) => i.name === "limit")).toBe(true);
    expect(searchTool.run.some((s: any) => s.name === "mvp:function" || s.name === "mvp:workspace_run_function")).toBe(true);
  });
});
