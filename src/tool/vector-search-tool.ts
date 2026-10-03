/**
 * `vector_search` — AI Agent Tool definition for semantic multimodal vector search.
 */
import { tool, input, s, inp, ref, type ToolDef, type InputDescriptor } from "@xano/sdk";
import { type ResolvedOptions } from "../options.js";
import type { SearchVectorsFn } from "../functions/search.js";

/** Return type for vectorSearchTool. */
export type VectorSearchTool = ToolDef<
  Record<string, InputDescriptor>,
  unknown
>;

/** Build the `vector_search` agent tool definition. */
export function vectorSearchTool(
  opts: ResolvedOptions,
  searchFn: SearchVectorsFn,
): VectorSearchTool {
  const citationGuide =
    opts.citationFormat === "markdown"
      ? " When citing or referencing any retrieved documents, images, audio, or files, format links to the document as `[Document Title](#doc-<document_id>)`."
      : opts.citationFormat === "numeric"
        ? " When citing or referencing any retrieved documents, cite the document as `(Document ID <document_id>)`."
        : "";

  return tool({
    name: opts.names.searchTool,
    description:
      "Search the indexed document and media knowledge base using semantic vector similarity with Gemini multimodal embeddings.",
    instructions:
      "Use this tool to search and retrieve facts, documentation, notes, specifications, images, and media files from the user's knowledge base to answer questions." +
      citationGuide,
    tags: opts.tags,
    input: {
      query: input.text({
        required: false,
        description: "Natural language search query to locate relevant context or media.",
      }),
      media_data: input.text({
        required: false,
        description: "Optional base64 media data for visual/audio search queries.",
      }),
      mime_type: input.text({
        default: "text/plain",
        description: "MIME type for media data if provided (e.g. image/png, audio/mp3).",
      }),
      limit: input.int({
        default: 5,
        description: "Maximum number of relevant chunks to retrieve (default: 5).",
      }),
    },
    stack: [
      s.function.run({
        fn: searchFn,
        input: {
          query: inp("query"),
          query_media_data: inp("media_data"),
          query_mime_type: inp("mime_type"),
          limit: inp("limit"),
        },
        as: "search_res",
      }),
    ],
    response: ref("search_res.results"),
  });
}
