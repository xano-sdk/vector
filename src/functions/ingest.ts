/**
 * `vector/ingest_document` — orchestrates chunking, multimodal embedding generation,
 * and bulk persistence into `document_chunk` and `document` tables.
 */
import {
  defineFunction,
  input,
  s,
  setVar,
  c,
  inp,
  ref,
  col,
  expr,
  and,
  obj,
  withFilters,
  fl,
  type FunctionDef,
  type InputDescriptor,
} from "@xano/sdk";
import { type ResolvedOptions } from "../options.js";
import type { DocumentTable } from "../tables/document.js";
import type { ChunkTable } from "../tables/chunk.js";
import type { GenerateEmbeddingFn } from "./embed.js";
import type { ChunkTextFn } from "./chunk.js";

/** Return type for ingestDocumentFn. */
export type IngestDocumentFn = FunctionDef<
  Record<string, InputDescriptor>,
  { document_id: number; status: string; chunk_count: number }
>;

/** Build the `ingestDocument` function definition. */
export function ingestDocumentFn(
  opts: ResolvedOptions,
  document: DocumentTable,
  chunk: ChunkTable,
  embedFn: GenerateEmbeddingFn,
  chunkFn: ChunkTextFn,
): IngestDocumentFn {
  return defineFunction({
    name: opts.names.ingestFn,
    description:
      "Fetches a document/media record, chunks text (or processes media), generates Gemini embeddings, and saves chunks.",
    tags: opts.tags,
    input: {
      document_id: input.int({
        required: true,
        description: "The primary key ID of the document to ingest and index.",
      }),
      api_key: input.text({
        required: false,
        description: "Optional Google API key override.",
      }),
    },
    stack: [
      s.db.get({
        table: document,
        fieldValue: inp("document_id"),
        as: "doc",
      }),
      s.precondition({
        expr: expr(ref("doc"), "!=", c.null()),
        error_type: "notfound",
        error: c.text("ingest_document: document not found."),
      }),
      s.db.edit({
        table: document,
        fieldValue: ref("doc.id"),
        row: {
          status: c.text("indexing"),
          error_message: c.null(),
        },
      }),
      s.db.bulk.delete({
        table: chunk,
        where: expr(col("document_id"), "=", ref("doc.id")),
      }),
      s.conditional({
        when: and(
          expr(ref("doc.media_data"), "!=", c.null()),
          expr(ref("doc.media_data"), "!=", c.text("")),
        ),
        then: [
          setVar(
            "media_text_label",
            withFilters(ref("doc.content"), [fl.first_notempty(ref("doc.title"))]),
          ),
          s.function.run({
            fn: embedFn,
            input: {
              text: ref("media_text_label"),
              media_data: ref("doc.media_data"),
              mime_type: ref("doc.mime_type"),
              task_type: c.text(opts.taskTypeDocument),
              api_key: inp("api_key"),
            },
            as: "single_embed_res",
          }),
          s.db.add({
            table: chunk,
            row: {
              document_id: ref("doc.id"),
              document_title: ref("doc.title"),
              chunk_index: c.int(0),
              content: ref("media_text_label"),
              mime_type: ref("doc.mime_type"),
              embedding: ref("single_embed_res.embedding"),
              metadata: ref("doc.metadata"),
              char_count: c.int(0),
            },
          }),
          setVar("final_chunk_count", c.int(1)),
        ],
        else: [
          s.function.run({
            fn: chunkFn,
            input: {
              content: ref("doc.content"),
              strategy: ref("doc.strategy"),
              chunk_size: ref("doc.chunk_size"),
              chunk_overlap: ref("doc.chunk_overlap"),
            },
            as: "chunks_res",
          }),
          s.foreach({
            list: ref("chunks_res.chunks"),
            as: "item",
            body: [
              s.function.run({
                fn: embedFn,
                input: {
                  text: ref("item.content"),
                  task_type: c.text(opts.taskTypeDocument),
                  api_key: inp("api_key"),
                },
                as: "embed_res",
              }),
              s.db.add({
                table: chunk,
                row: {
                  document_id: ref("doc.id"),
                  document_title: ref("doc.title"),
                  chunk_index: ref("item.index"),
                  content: ref("item.content"),
                  mime_type: ref("doc.mime_type"),
                  embedding: ref("embed_res.embedding"),
                  metadata: ref("item.metadata"),
                  char_count: ref("item.char_count"),
                },
              }),
            ],
          }),
          setVar("final_chunk_count", ref("chunks_res.count")),
        ],
      }),
      s.db.edit({
        table: document,
        fieldValue: ref("doc.id"),
        row: {
          status: c.text("indexed"),
          chunk_count: ref("final_chunk_count"),
          error_message: c.null(),
        },
      }),
    ],
    response: obj({
      document_id: ref("doc.id"),
      status: c.text("indexed"),
      chunk_count: ref("final_chunk_count"),
    }),
    responseShape: {} as {
      document_id: number;
      status: string;
      chunk_count: number;
    },
  }) as unknown as IngestDocumentFn;
}
