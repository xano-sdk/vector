/**
 * @xano-sdk/vector — a plug-and-play vector embedding and semantic search pipeline for Xano.
 *
 * Uses Google Gemini Embeddings 2 at 768 dimensions with pgvector cosine similarity search,
 * flexible chunking strategies (fixed, paragraph, sentence, markdown, custom), document
 * ingestion workflows, and a ready-to-attach AI Agent knowledge retrieval tool.
 *
 * ```ts
 * import { workspace } from "@xano/sdk";
 * import { registerVector } from "@xano-sdk/vector";
 *
 * export const vector = registerVector(workspace("my-app"), {
 *   apiKeyEnv: "GEMINI_API_KEY",
 * });
 *
 * export default vector.xano;
 * ```
 */

export { createVector, registerVector } from "./register.js";
export type { Vector, RegisteredVector, DocumentFamily, SearchFamily } from "./register.js";

export {
  resolveOptions,
  CHUNK_STRATEGIES,
  DOCUMENT_STATUSES,
  GEMINI_EMBEDDING_DIMENSIONS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_API_KEY_ENV,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_THRESHOLD,
  DEFAULT_STRATEGY,
  DEFAULT_NAMES,
} from "./options.js";
export type {
  VectorOptions,
  VectorNames,
  VectorAuthTable,
  ResolvedOptions,
  ChunkStrategy,
  DocumentStatus,
} from "./options.js";

/** Def factories for manual assembly and cherry-picking. */
export { documentTable, PUBLIC_DOCUMENT_FIELDS } from "./tables/document.js";
export type { DocumentTable, DocumentRow, PublicDocument } from "./tables/document.js";

export { chunkTable, PUBLIC_CHUNK_FIELDS } from "./tables/chunk.js";
export type { ChunkTable, ChunkRow, PublicChunk } from "./tables/chunk.js";

export { generateEmbeddingFn } from "./functions/embed.js";
export type { GenerateEmbeddingFn } from "./functions/embed.js";

export { chunkTextFn } from "./functions/chunk.js";
export type { ChunkTextFn, ChunkItem } from "./functions/chunk.js";

export { ingestDocumentFn } from "./functions/ingest.js";
export type { IngestDocumentFn } from "./functions/ingest.js";

export { searchVectorsFn } from "./functions/search.js";
export type { SearchVectorsFn, SearchHit } from "./functions/search.js";

export { vectorSearchTool } from "./tool/vector-search-tool.js";
export type { VectorSearchTool } from "./tool/vector-search-tool.js";

export { vectorGroup } from "./api/group.js";
export type { VectorGroup } from "./api/group.js";

export { documentQueries } from "./api/documents.js";
export { searchQueries } from "./api/search.js";

/** Hand-declared response and payload shapes. */
export type {
  CreateDocumentPayload,
  CreateDocumentResult,
  ListDocumentsResult,
  GetDocumentResult,
  DeleteDocumentResult,
  ReindexDocumentPayload,
  SearchPayload,
  SearchResult,
  EmbedPayload,
  EmbedResult,
} from "./api/types.js";

/** Client endpoint types. */
export type {
  CreateDocumentInput,
  CreateDocumentBody,
  CreateDocumentResponse,
  ListDocumentsInput,
  ListDocumentsQuery,
  ListDocumentsResponse,
  GetDocumentInput,
  GetDocumentParams,
  GetDocumentResponse,
  DeleteDocumentInput,
  DeleteDocumentParams,
  DeleteDocumentResponse,
  ReindexDocumentInput,
  ReindexDocumentParams,
  ReindexDocumentBody,
  ReindexDocumentResponse,
  SearchInput,
  SearchBody,
  SearchResponse,
  EmbedInput,
  EmbedBody,
  EmbedResponse,
  VectorEndpoint,
  VectorEndpoints,
  VectorEndpointName,
} from "./api/client-types.js";
