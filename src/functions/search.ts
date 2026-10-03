/**
 * `vector/search_vectors` — performs cosine similarity vector search over the chunk table
 * using pgvector and Gemini 768-dimensional multimodal embeddings.
 */
import {
  defineFunction,
  input,
  s,
  setVar,
  c,
  inp,
  ref,
  expr,
  or,
  obj,
  withFilters,
  fl,
  type FunctionDef,
  type InputDescriptor,
} from "@xano/sdk";
import { type ResolvedOptions, GEMINI_EMBEDDING_DIMENSIONS } from "../options.js";
import type { ChunkTable } from "../tables/chunk.js";
import type { GenerateEmbeddingFn } from "./embed.js";

/** A single vector search hit item. */
export interface SearchHit {
  id: number;
  document_id: number;
  document_title?: string;
  chunk_index: number;
  content: string;
  mime_type: string;
  metadata: Record<string, unknown>;
  distance: number;
}

/** Return type for searchVectorsFn. */
export type SearchVectorsFn = FunctionDef<
  Record<string, InputDescriptor>,
  { results: SearchHit[]; count: number }
>;

/** Build the `searchVectors` function definition. */
export function searchVectorsFn(
  opts: ResolvedOptions,
  chunk: ChunkTable,
  embedFn: GenerateEmbeddingFn,
): SearchVectorsFn {
  return defineFunction({
    name: opts.names.searchFn,
    description:
      "Performs semantic similarity search over document chunks using Gemini 768-dim embeddings and pgvector.",
    tags: opts.tags,
    input: {
      query: input.text({
        required: false,
        description: "Natural language query string. If provided, embedded via Gemini.",
      }),
      query_media_data: input.text({
        required: false,
        description: "Base64-encoded media data for visual/audio/multimodal search queries.",
      }),
      query_mime_type: input.text({
        default: "text/plain",
        description: "MIME type for query media data (e.g. image/png, audio/mp3).",
      }),
      query_embedding: input.vector(GEMINI_EMBEDDING_DIMENSIONS, {
        required: false,
        description: "Pre-computed 768-dimensional query vector embedding.",
      }),
      limit: input.int({
        default: opts.searchLimit,
        description: "Maximum number of search results to return.",
      }),
      threshold: input.decimal({
        default: opts.searchThreshold,
        description: "Minimum cosine similarity score threshold (0.0 to 1.0).",
      }),
      api_key: input.text({
        required: false,
        description: "Optional Google API key override.",
      }),
    },
    stack: [
      setVar("target_embedding", inp("query_embedding")),
      s.conditional({
        when: expr(ref("target_embedding"), "=", c.null()),
        then: [
          s.precondition({
            expr: or(
              expr(inp("query"), "!=", c.text("")),
              expr(inp("query_media_data"), "!=", c.text("")),
            ),
            error_type: "badrequest",
            error: c.text("search_vectors: either `query` text, `query_media_data`, or `query_embedding` vector must be provided."),
          }),
          s.function.run({
            fn: embedFn,
            input: {
              text: inp("query"),
              media_data: inp("query_media_data"),
              mime_type: inp("query_mime_type"),
              task_type: c.text(opts.taskTypeQuery),
              api_key: inp("api_key"),
            },
            as: "embed_query_res",
          }),
          setVar("target_embedding", ref("embed_query_res.embedding")),
        ],
      }),
      s.db.query({
        table: chunk,
        eval: [
          {
            name: "embedding",
            as: "distance",
            filters: [
              {
                name: "vector_cos_distance",
                arg: [ref("target_embedding")],
              },
            ],
          },
        ],
        sort: [{ sortBy: "distance", dir: "asc" }],
        paging: { per_page: inp("limit") },
        as: "hits",
      }),
    ],
    response: obj({
      results: ref("hits.items"),
      count: withFilters(ref("hits.items"), [fl.count()]),
    }),
    responseShape: {} as {
      results: SearchHit[];
      count: number;
    },
  }) as unknown as SearchVectorsFn;
}
