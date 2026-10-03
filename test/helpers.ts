/**
 * Shared test fixtures and bundle introspection helpers.
 */
import { createHash } from "node:crypto";
import { table, f, Xano } from "@xano/sdk";
import { createVector, registerVector, type VectorOptions } from "../src/index.js";

/** A standard `auth: true` table for tests. */
export const testUserTable = table({
  name: "test_user",
  auth: true,
  useXdo: false,
  schema: { email: f.email({ required: true, methods: ["trim", "lower"] }) },
});

/** A uuid-keyed user table for `userIdType: "uuid"`. */
export const uuidUserTable = table({
  name: "uuid_user",
  auth: true,
  useXdo: false,
  idType: "uuid",
  schema: { email: f.email({ required: true }) },
});

/** Helper to create vector defs with testUserTable. */
export const testVector = (opts: VectorOptions = {}) =>
  createVector({ authTable: testUserTable, ...opts });

/**
 * Register into a fresh workspace and return the exported payload map.
 */
export const exportWith = (
  opts: VectorOptions = {},
  { name = "xts-vector-test", extraTables = [] as any[] } = {},
) => {
  const xano = new Xano().registerWorkspace({ name });
  const authTable = opts.authTable ?? testUserTable;
  const tables = typeof authTable === "string" ? extraTables : [authTable, ...extraTables];
  if (tables.length) xano.registerTables(tables);
  registerVector(xano, { authTable, ...opts });
  return (xano.export() as any).payload;
};

/** Recompute `md5("<kind>:<name>")` locally so tests do not raise the peer floor. */
const derive = (kind: string, name: string) =>
  createHash("md5").update(`${kind}:${name}`).digest("hex");

export const guidFor = {
  table: (name: string) => derive("dbo", name),
  fn: (name: string) => derive("function", name),
  query: (name: string) => derive("query", name),
  group: (name: string) => derive("app", name),
  toolset: (name: string) => derive("toolset", name),
  tool: (name: string) => derive("tool", name),
};

export const section = (payload: any, key: string): any[] => payload[key] ?? [];
export const byName = (rows: any[], name: string) => rows.find((r) => r?.name === name);
export const queriesByName = (payload: any): Record<string, any> =>
  Object.fromEntries(section(payload, "query").map((q) => [q.name, q]));
export const tableRow = (payload: any, name: string) => byName(section(payload, "dbo"), name);
export const column = (tableRow: any, name: string) =>
  (tableRow?.schema ?? []).find((col: any) => col?.name === name);
