/**
 * Configuration options and validator for `@xano-sdk/vector`.
 */
import type { TableDef } from "@xano/sdk";

/** Supported text chunking strategies. */
export const CHUNK_STRATEGIES = [
  "fixed",
  "paragraph",
  "sentence",
  "markdown",
  "custom",
] as const;

export type ChunkStrategy = (typeof CHUNK_STRATEGIES)[number];

/** Document indexing lifecycle status. */
export const DOCUMENT_STATUSES = [
  "pending",
  "indexing",
  "indexed",
  "failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Supported citation formatting styles for AI agents. */
export type CitationFormat = "markdown" | "numeric" | "none";

/** Supported auth table references. */
export type VectorAuthTable = TableDef | string;

/** Multimodal Google Gemini Embeddings 2 operates at 768 dimensions using MRL. */
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

/** Default embedding model for Gemini Embeddings 2. */
export const DEFAULT_GEMINI_MODEL = "gemini-embedding-2";

/** Default environment variable name for the Google API key. */
export const DEFAULT_API_KEY_ENV = "GEMINI_API_KEY";

/** Default chunking character size. */
export const DEFAULT_CHUNK_SIZE = 500;

/** Default chunking character overlap. */
export const DEFAULT_CHUNK_OVERLAP = 50;

/** Default top-k vector search limit. */
export const DEFAULT_SEARCH_LIMIT = 10;

/** Default similarity threshold (0.0 to 1.0). */
export const DEFAULT_SEARCH_THRESHOLD = 0.0;

/** Default chunking strategy. */
export const DEFAULT_STRATEGY: ChunkStrategy = "paragraph";

/** Custom naming overrides for generated defs. */
export interface VectorNames {
  document?: string;
  chunk?: string;
  embedFn?: string;
  chunkFn?: string;
  ingestFn?: string;
  searchFn?: string;
  searchTool?: string;
  apiGroup?: string;
}

export const DEFAULT_NAMES: Required<VectorNames> = {
  document: "vector_document",
  chunk: "vector_chunk",
  embedFn: "vector/generate_embedding",
  chunkFn: "vector/chunk_text",
  ingestFn: "vector/ingest_document",
  searchFn: "vector/search_vectors",
  searchTool: "vector_search",
  apiGroup: "Vector",
};

/** User-facing configuration options for `createVector` and `registerVector`. */
export interface VectorOptions {
  authTable?: TableDef | string;
  authenticated?: boolean;
  userIdType?: "int" | "uuid";
  model?: string;
  apiKeyEnv?: string;
  defaultStrategy?: ChunkStrategy;
  defaultChunkSize?: number;
  defaultChunkOverlap?: number;
  searchLimit?: number;
  searchThreshold?: number;
  taskTypeDocument?: string;
  taskTypeQuery?: string;
  citationFormat?: CitationFormat;
  routePrefix?: string;
  canonical?: string;
  names?: VectorNames;
  tags?: string[];
}

/** Fully resolved, validated options ready for internal consumption. */
export interface ResolvedOptions {
  authTable: TableDef | string | undefined;
  authenticated: boolean;
  userIdType: "int" | "uuid";
  model: string;
  apiKeyEnv: string;
  dimensions: number;
  defaultStrategy: ChunkStrategy;
  defaultChunkSize: number;
  defaultChunkOverlap: number;
  searchLimit: number;
  searchThreshold: number;
  taskTypeDocument: string;
  taskTypeQuery: string;
  citationFormat: CitationFormat;
  routePrefix: string;
  canonical: string | undefined;
  names: Required<VectorNames>;
  tags: string[];
}

const CANONICAL_PATTERN = /^[a-zA-Z0-9_-]+$/;

function inferTableKeyType(table: TableDef | string | undefined): "int" | "uuid" {
  if (!table || typeof table === "string") return "int";
  if (table.idType === "uuid") return "uuid";
  return "int";
}

/**
 * Validates and resolves `VectorOptions` into a complete `ResolvedOptions`.
 */
export function resolveOptions(opts: VectorOptions = {}): ResolvedOptions {
  const authenticated = opts.authenticated ?? (opts.authTable !== undefined);

  if (authenticated && opts.authTable === undefined) {
    throw new Error(
      "resolveOptions: `authTable` is required when `authenticated` is true.",
    );
  }

  const userIdType = opts.userIdType ?? inferTableKeyType(opts.authTable);
  if (userIdType !== "int" && userIdType !== "uuid") {
    throw new Error(
      `resolveOptions: \`userIdType\` must be "int" or "uuid", got "${userIdType}".`,
    );
  }

  const model = opts.model ?? DEFAULT_GEMINI_MODEL;
  if (typeof model !== "string" || !model.trim()) {
    throw new Error("resolveOptions: `model` must be a non-empty string.");
  }

  const apiKeyEnv = opts.apiKeyEnv ?? DEFAULT_API_KEY_ENV;
  if (typeof apiKeyEnv !== "string" || !apiKeyEnv.trim()) {
    throw new Error("resolveOptions: `apiKeyEnv` must be a non-empty string.");
  }

  const defaultStrategy = opts.defaultStrategy ?? DEFAULT_STRATEGY;
  if (!CHUNK_STRATEGIES.includes(defaultStrategy)) {
    throw new Error(
      `resolveOptions: \`defaultStrategy\` must be one of [${CHUNK_STRATEGIES.join(", ")}], got "${defaultStrategy}".`,
    );
  }

  const defaultChunkSize = opts.defaultChunkSize ?? DEFAULT_CHUNK_SIZE;
  if (
    typeof defaultChunkSize !== "number" ||
    !Number.isInteger(defaultChunkSize) ||
    defaultChunkSize < 20 ||
    defaultChunkSize > 10000
  ) {
    throw new Error(
      `resolveOptions: \`defaultChunkSize\` must be an integer between 20 and 10000, got ${defaultChunkSize}.`,
    );
  }

  const defaultChunkOverlap = opts.defaultChunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  if (
    typeof defaultChunkOverlap !== "number" ||
    !Number.isInteger(defaultChunkOverlap) ||
    defaultChunkOverlap < 0 ||
    defaultChunkOverlap >= defaultChunkSize
  ) {
    throw new Error(
      `resolveOptions: \`defaultChunkOverlap\` must be an integer >= 0 and < defaultChunkSize, got ${defaultChunkOverlap}.`,
    );
  }

  const searchLimit = opts.searchLimit ?? DEFAULT_SEARCH_LIMIT;
  if (
    typeof searchLimit !== "number" ||
    !Number.isInteger(searchLimit) ||
    searchLimit < 1 ||
    searchLimit > 100
  ) {
    throw new Error(
      `resolveOptions: \`searchLimit\` must be an integer between 1 and 100, got ${searchLimit}.`,
    );
  }

  const searchThreshold = opts.searchThreshold ?? DEFAULT_SEARCH_THRESHOLD;
  if (
    typeof searchThreshold !== "number" ||
    searchThreshold < 0.0 ||
    searchThreshold > 1.0
  ) {
    throw new Error(
      `resolveOptions: \`searchThreshold\` must be a number between 0.0 and 1.0, got ${searchThreshold}.`,
    );
  }

  const taskTypeDocument = opts.taskTypeDocument ?? "RETRIEVAL_DOCUMENT";
  const taskTypeQuery = opts.taskTypeQuery ?? "RETRIEVAL_QUERY";
  const citationFormat = opts.citationFormat ?? "markdown";

  if (opts.names) {
    for (const [k, v] of Object.entries(opts.names)) {
      if (typeof v !== "string" || !v.trim()) {
        throw new Error(`resolveOptions: names.${k} must be a non-empty string.`);
      }
    }
  }

  let routePrefix = opts.routePrefix ?? "vector";
  if (opts.canonical !== undefined) {
    const trimmed = opts.canonical.trim();
    if (!trimmed || !CANONICAL_PATTERN.test(trimmed)) {
      throw new Error(
        `resolveOptions: \`canonical\` must match ${CANONICAL_PATTERN}, got "${opts.canonical}".`,
      );
    }
    routePrefix = trimmed;
  }

  routePrefix = routePrefix.replace(/^\/+|\/+$/g, "");

  const names: Required<VectorNames> = {
    document: opts.names?.document ?? (opts.canonical ? `${opts.canonical}_document` : DEFAULT_NAMES.document),
    chunk: opts.names?.chunk ?? (opts.canonical ? `${opts.canonical}_chunk` : DEFAULT_NAMES.chunk),
    embedFn: opts.names?.embedFn ?? (opts.canonical ? `${opts.canonical}/generate_embedding` : DEFAULT_NAMES.embedFn),
    chunkFn: opts.names?.chunkFn ?? (opts.canonical ? `${opts.canonical}/chunk_text` : DEFAULT_NAMES.chunkFn),
    ingestFn: opts.names?.ingestFn ?? (opts.canonical ? `${opts.canonical}/ingest_document` : DEFAULT_NAMES.ingestFn),
    searchFn: opts.names?.searchFn ?? (opts.canonical ? `${opts.canonical}/search_vectors` : DEFAULT_NAMES.searchFn),
    searchTool: opts.names?.searchTool ?? DEFAULT_NAMES.searchTool,
    apiGroup: opts.names?.apiGroup ?? (opts.canonical ? `Vector (${opts.canonical})` : DEFAULT_NAMES.apiGroup),
  };

  const tags = opts.tags ?? ["vector", "ai", "search"];

  return {
    authTable: opts.authTable,
    authenticated,
    userIdType,
    model,
    apiKeyEnv,
    dimensions: GEMINI_EMBEDDING_DIMENSIONS,
    defaultStrategy,
    defaultChunkSize,
    defaultChunkOverlap,
    searchLimit,
    searchThreshold,
    taskTypeDocument,
    taskTypeQuery,
    citationFormat,
    routePrefix,
    canonical: opts.canonical,
    names,
    tags,
  };
}
