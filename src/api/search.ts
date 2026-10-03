import { query, input, s, inp, ref, obj } from "@xano/sdk";
import { type ResolvedOptions, GEMINI_EMBEDDING_DIMENSIONS } from "../options.js";
import type { VectorGroup } from "./group.js";
import type { SearchVectorsFn } from "../functions/search.js";
import type { GenerateEmbeddingFn } from "../functions/embed.js";
import type { SearchResult, EmbedResult } from "./types.js";

export function searchQueries(
  opts: ResolvedOptions,
  group: VectorGroup,
  searchFn: SearchVectorsFn,
  embedFn: GenerateEmbeddingFn,
) {
  const prefix = opts.routePrefix;
  const authGate = opts.authenticated ? opts.authTable : false;

  const searchEndpoint = query({
    name: `${prefix}/search`,
    verb: "POST",
    apiGroup: group,
    auth: authGate,
    description: "Search document chunks and media using semantic similarity via 768-dim Gemini vector embeddings.",
    tags: opts.tags,
    input: {
      query: input.text({
        required: false,
        description: "Natural language query string.",
      }),
      query_media_data: input.text({
        required: false,
        description: "Base64-encoded media data for visual/audio search queries.",
      }),
      query_mime_type: input.text({
        default: "text/plain",
        description: "MIME type for media data if provided.",
      }),
      query_embedding: input.vector(GEMINI_EMBEDDING_DIMENSIONS, {
        required: false,
        description: "Pre-computed 768-dimensional query vector.",
      }),
      limit: input.int({
        default: opts.searchLimit,
        description: "Maximum number of search results to return.",
      }),
      threshold: input.decimal({
        default: opts.searchThreshold,
        description: "Minimum similarity threshold (0.0 to 1.0).",
      }),
    },
    stack: [
      s.function.run({
        fn: searchFn,
        input: {
          query: inp("query"),
          query_media_data: inp("query_media_data"),
          query_mime_type: inp("query_mime_type"),
          query_embedding: inp("query_embedding"),
          limit: inp("limit"),
          threshold: inp("threshold"),
        },
        as: "search_res",
      }),
    ],
    response: obj({
      results: ref("search_res.results"),
      count: ref("search_res.count"),
    }),
    responseShape: {} as SearchResult,
  });

  const embedEndpoint = query({
    name: `${prefix}/embed`,
    verb: "POST",
    apiGroup: group,
    auth: authGate,
    description: "Directly generates a 768-dimensional vector embedding for text or media using Google Gemini API.",
    tags: opts.tags,
    input: {
      text: input.text({
        required: false,
        description: "Text content to generate an embedding vector for.",
      }),
      media_data: input.text({
        required: false,
        description: "Base64 media data (image, audio, video).",
      }),
      mime_type: input.text({
        default: "text/plain",
        description: "MIME type for media data if provided.",
      }),
      model: input.text({
        default: opts.model,
        description: "Google Gemini embedding model name.",
      }),
    },
    stack: [
      s.function.run({
        fn: embedFn,
        input: {
          text: inp("text"),
          media_data: inp("media_data"),
          mime_type: inp("mime_type"),
          model: inp("model"),
        },
        as: "embed_res",
      }),
    ],
    response: ref("embed_res"),
    responseShape: {} as EmbedResult,
  });

  return {
    search: searchEndpoint,
    embed: embedEndpoint,
    all: [searchEndpoint, embedEndpoint] as const,
  };
}
