import { describe, it, expect } from "vitest";
import {
  resolveOptions,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_API_KEY_ENV,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_THRESHOLD,
  DEFAULT_STRATEGY,
  DEFAULT_NAMES,
  GEMINI_EMBEDDING_DIMENSIONS,
} from "../src/options.js";
import { testUserTable, uuidUserTable } from "./helpers.js";

describe("resolveOptions", () => {
  it("resolves default options when called with empty object", () => {
    const opts = resolveOptions({});
    expect(opts.authenticated).toBe(false);
    expect(opts.authTable).toBeUndefined();
    expect(opts.userIdType).toBe("int");
    expect(opts.model).toBe(DEFAULT_GEMINI_MODEL);
    expect(opts.apiKeyEnv).toBe(DEFAULT_API_KEY_ENV);
    expect(opts.dimensions).toBe(GEMINI_EMBEDDING_DIMENSIONS);
    expect(opts.defaultStrategy).toBe(DEFAULT_STRATEGY);
    expect(opts.defaultChunkSize).toBe(DEFAULT_CHUNK_SIZE);
    expect(opts.defaultChunkOverlap).toBe(DEFAULT_CHUNK_OVERLAP);
    expect(opts.searchLimit).toBe(DEFAULT_SEARCH_LIMIT);
    expect(opts.searchThreshold).toBe(DEFAULT_SEARCH_THRESHOLD);
    expect(opts.routePrefix).toBe("vector");
    expect(opts.names).toEqual(DEFAULT_NAMES);
    expect(opts.tags).toEqual(["vector", "ai", "search"]);
  });

  it("infers authenticated: true and userIdType when authTable is provided", () => {
    const opts = resolveOptions({ authTable: testUserTable });
    expect(opts.authenticated).toBe(true);
    expect(opts.userIdType).toBe("int");

    const uuidOpts = resolveOptions({ authTable: uuidUserTable });
    expect(uuidOpts.authenticated).toBe(true);
    expect(uuidOpts.userIdType).toBe("uuid");
  });

  it("throws when authenticated: true but authTable is missing", () => {
    expect(() => resolveOptions({ authenticated: true })).toThrow(
      "resolveOptions: `authTable` is required when `authenticated` is true.",
    );
  });

  it("validates userIdType override", () => {
    expect(() =>
      resolveOptions({ authTable: "custom_user", userIdType: "invalid" as any }),
    ).toThrow('resolveOptions: `userIdType` must be "int" or "uuid", got "invalid".');
  });

  it("validates chunk size bounds", () => {
    expect(() => resolveOptions({ defaultChunkSize: 10 })).toThrow(
      "resolveOptions: `defaultChunkSize` must be an integer between 20 and 10000",
    );
    expect(() => resolveOptions({ defaultChunkSize: 20000 })).toThrow(
      "resolveOptions: `defaultChunkSize` must be an integer between 20 and 10000",
    );
    expect(() => resolveOptions({ defaultChunkSize: 50.5 as any })).toThrow(
      "resolveOptions: `defaultChunkSize` must be an integer",
    );
  });

  it("validates chunk overlap bounds", () => {
    expect(() => resolveOptions({ defaultChunkSize: 100, defaultChunkOverlap: -5 })).toThrow(
      "resolveOptions: `defaultChunkOverlap` must be an integer >= 0 and < defaultChunkSize",
    );
    expect(() => resolveOptions({ defaultChunkSize: 100, defaultChunkOverlap: 100 })).toThrow(
      "resolveOptions: `defaultChunkOverlap` must be an integer >= 0 and < defaultChunkSize",
    );
    expect(() => resolveOptions({ defaultChunkSize: 100, defaultChunkOverlap: 150 })).toThrow(
      "resolveOptions: `defaultChunkOverlap` must be an integer >= 0 and < defaultChunkSize",
    );
  });

  it("validates chunk strategy", () => {
    expect(() => resolveOptions({ defaultStrategy: "invalid_strat" as any })).toThrow(
      'resolveOptions: `defaultStrategy` must be one of [fixed, paragraph, sentence, markdown, custom], got "invalid_strat".',
    );
  });

  it("validates search limits and thresholds", () => {
    expect(() => resolveOptions({ searchLimit: 0 })).toThrow(
      "resolveOptions: `searchLimit` must be an integer between 1 and 100",
    );
    expect(() => resolveOptions({ searchLimit: 150 })).toThrow(
      "resolveOptions: `searchLimit` must be an integer between 1 and 100",
    );
    expect(() => resolveOptions({ searchThreshold: -0.1 })).toThrow(
      "resolveOptions: `searchThreshold` must be a number between 0.0 and 1.0",
    );
    expect(() => resolveOptions({ searchThreshold: 1.5 })).toThrow(
      "resolveOptions: `searchThreshold` must be a number between 0.0 and 1.0",
    );
  });

  it("normalizes routePrefix", () => {
    const opts = resolveOptions({ routePrefix: "/my-vector/api/" });
    expect(opts.routePrefix).toBe("my-vector/api");
  });

  it("validates custom names are non-empty", () => {
    expect(() => resolveOptions({ names: { document: "" } })).toThrow(
      "resolveOptions: names.document must be a non-empty string.",
    );
  });
});
