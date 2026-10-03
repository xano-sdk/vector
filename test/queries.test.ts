import { describe, it, expect } from "vitest";
import { exportWith, queriesByName } from "./helpers.js";

describe("endpoint queries", () => {
  it("encodes all 7 endpoints with expected verbs and paths", () => {
    const payload = exportWith({});
    const queries = queriesByName(payload);

    expect(queries["vector/documents/create"]).toBeDefined();
    expect(queries["vector/documents/create"].verb).toBe("POST");

    expect(queries["vector/documents"]).toBeDefined();
    expect(queries["vector/documents"].verb).toBe("GET");

    expect(queries["vector/documents/{id}"]).toBeDefined();
    expect(queries["vector/documents/{id}"].verb).toBe("GET");

    expect(queries["vector/documents/{id}/delete"]).toBeDefined();
    expect(queries["vector/documents/{id}/delete"].verb).toBe("DELETE");

    expect(queries["vector/documents/{id}/reindex"]).toBeDefined();
    expect(queries["vector/documents/{id}/reindex"].verb).toBe("POST");

    expect(queries["vector/search"]).toBeDefined();
    expect(queries["vector/search"].verb).toBe("POST");

    expect(queries["vector/embed"]).toBeDefined();
    expect(queries["vector/embed"].verb).toBe("POST");
  });

  it("respects custom routePrefix", () => {
    const payload = exportWith({ routePrefix: "kb" });
    const queries = queriesByName(payload);

    expect(queries["kb/documents/create"]).toBeDefined();
    expect(queries["kb/documents"]).toBeDefined();
    expect(queries["kb/search"]).toBeDefined();
    expect(queries["kb/embed"]).toBeDefined();
  });
});
