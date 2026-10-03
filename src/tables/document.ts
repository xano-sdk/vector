/**
 * The `document` table — stores uploaded documents, media assets, and indexing status.
 */
import { table, f, type TableDef, type InferRow } from "@xano/sdk";
import {
  type ResolvedOptions,
  DOCUMENT_STATUSES,
  CHUNK_STRATEGIES,
} from "../options.js";

/** Build the `document` def for the given resolved options. */
export function documentTable(opts: ResolvedOptions) {
  const schema: Record<string, ReturnType<typeof f.text | typeof f.json | typeof f.int | typeof f.enum | typeof f.tableRef>> = {
    title: f.text({
      required: true,
      methods: ["trim", "min:1"],
      description: "Human-readable title or filename for the document.",
    }),
    content: f.text({
      required: false,
      description: "Raw textual content of the document.",
    }),
    media_data: f.text({
      required: false,
      description: "Base64-encoded media data for multimodal documents (image, audio, video).",
    }),
    mime_type: f.text({
      default: "text/plain",
      description: "MIME type (e.g. text/markdown, image/png, image/jpeg, audio/mp3, video/mp4).",
    }),
    metadata: f.json({
      description: "Arbitrary structured metadata (tags, author, source URL, dimensions, etc.).",
    }),
    status: f.enum(DOCUMENT_STATUSES, {
      default: "pending",
      description: "Current indexing lifecycle status: pending, indexing, indexed, or failed.",
    }),
    chunk_count: f.int({
      default: 0,
      description: "Total number of vector chunks generated from this document.",
    }),
    strategy: f.enum(CHUNK_STRATEGIES, {
      default: opts.defaultStrategy,
      description: "Chunking strategy used during indexing.",
    }),
    chunk_size: f.int({
      default: opts.defaultChunkSize,
      description: "Target character chunk size used during indexing.",
    }),
    chunk_overlap: f.int({
      default: opts.defaultChunkOverlap,
      description: "Chunk character overlap used during indexing.",
    }),
    error_message: f.text({
      description: "Error description if status is failed.",
    }),
  };

  if (opts.authenticated && opts.authTable) {
    schema.user_id = f.tableRef(opts.authTable as TableDef, {
      required: false,
      description: "The user who owns or uploaded this document.",
    });
  }

  const indexes = [
    {
      type: "btree" as const,
      fields: [{ name: "status", op: "asc" as const }],
    },
  ];

  if (opts.authenticated && opts.authTable) {
    indexes.push({
      type: "btree" as const,
      fields: [{ name: "user_id", op: "asc" as const }],
    });
  }

  return table({
    name: opts.names.document,
    description: "Source documents and media assets managed by the vector pipeline.",
    auth: false,
    useXdo: true,
    tags: opts.tags,
    schema,
    index: indexes,
  });
}

/** The `document` def type. */
export type DocumentTable = ReturnType<typeof documentTable>;

/** A `document` row. */
export type DocumentRow = InferRow<ReturnType<typeof documentTable>>;

/** Public fields returned for a document. */
export const PUBLIC_DOCUMENT_FIELDS = [
  "id",
  "created_at",
  "title",
  "content",
  "media_data",
  "mime_type",
  "metadata",
  "status",
  "chunk_count",
  "strategy",
  "chunk_size",
  "chunk_overlap",
  "error_message",
] as const;

export interface PublicDocument {
  id: number;
  created_at: number;
  title: string;
  content: string;
  media_data?: string;
  mime_type: string;
  metadata: Record<string, unknown>;
  status: string;
  chunk_count: number;
  strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  error_message?: string;
  user_id?: number | string;
}
