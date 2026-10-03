import { Xano, table, f } from "@xano/sdk";
import { registerVector } from "../src/index.js";

export const GOLDEN_WORKSPACE_NAME = "xts-vector-golden";

export const GOLDEN_FIXTURE_URL = new URL("./fixtures/golden-bundle.json", import.meta.url);

const goldenAuthTable = table({
  name: "golden_user",
  auth: true,
  useXdo: false,
  schema: { email: f.email({ required: true, methods: ["trim", "lower"] }) },
});

/** A fresh, fully-registered export. `Xano.export()` is deterministic. */
export const buildGoldenBundle = () => {
  const xano = new Xano()
    .registerWorkspace({ name: GOLDEN_WORKSPACE_NAME })
    .registerTables([goldenAuthTable]);
  registerVector(xano, {
    authTable: goldenAuthTable,
    authenticated: true,
    canonical: "vec",
    apiKeyEnv: "CUSTOM_GEMINI_KEY",
    model: "gemini-embedding-2",
    defaultStrategy: "markdown",
    defaultChunkSize: 400,
    defaultChunkOverlap: 40,
    searchLimit: 15,
    searchThreshold: 0.5,
    routePrefix: "vec",
  });
  return xano.export();
};

/** 2-space JSON with a trailing newline — the committed fixture's on-disk form. */
export const serializeGoldenBundle = (bundle: unknown) => JSON.stringify(bundle, null, 2) + "\n";
