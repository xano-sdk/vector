/**
 * Document CRUD and indexing API endpoints.
 */
import {
  query,
  input,
  s,
  setVar,
  c,
  inp,
  ref,
  auth,
  col,
  expr,
  or,
  obj,
  withFilters,
  fl,
} from "@xano/sdk";
import { type ResolvedOptions, CHUNK_STRATEGIES } from "../options.js";
import type { DocumentTable } from "../tables/document.js";
import type { ChunkTable } from "../tables/chunk.js";
import type { VectorGroup } from "./group.js";
import type { IngestDocumentFn } from "../functions/ingest.js";
import type {
  CreateDocumentResult,
  ListDocumentsResult,
  GetDocumentResult,
  DeleteDocumentResult,
  ReindexDocumentResult,
} from "./types.js";

function authWhere(opts: ResolvedOptions) {
  if (opts.authenticated && opts.authTable) {
    return expr(col("user_id"), "=", auth("id"));
  }
  return undefined;
}

export function documentQueries(
  opts: ResolvedOptions,
  group: VectorGroup,
  document: DocumentTable,
  chunk: ChunkTable,
  ingestFn: IngestDocumentFn,
) {
  const prefix = opts.routePrefix;
  const authGate = opts.authenticated ? opts.authTable : false;

  const createEndpoint = query({
    name: `${prefix}/documents/create`,
    verb: "POST",
    apiGroup: group,
    auth: authGate,
    description: "Create a new document or media asset and immediately chunk and index it.",
    tags: opts.tags,
    input: {
      title: input.text({
        required: true,
        description: "Title or filename for the document.",
      }),
      content: input.text({
        required: false,
        description: "Raw text content of the document.",
      }),
      media_data: input.text({
        required: false,
        description: "Base64-encoded media data (images, audio, video).",
      }),
      mime_type: input.text({
        default: "text/plain",
        description: "MIME type (e.g. text/markdown, image/png, audio/mp3).",
      }),
      metadata: input.json({
        required: false,
        description: "Arbitrary structured metadata.",
      }),
      strategy: input.enum(CHUNK_STRATEGIES, {
        default: opts.defaultStrategy,
        description: "Chunking algorithm for text content.",
      }),
      chunk_size: input.int({
        default: opts.defaultChunkSize,
        description: "Target maximum chunk size in characters.",
      }),
      chunk_overlap: input.int({
        default: opts.defaultChunkOverlap,
        description: "Chunk character overlap.",
      }),
    },
    stack: [
      s.precondition({
        expr: or(
          expr(inp("content"), "!=", c.text("")),
          expr(inp("media_data"), "!=", c.text("")),
        ),
        error_type: "badrequest",
        error: c.text("create_document: either `content` text or `media_data` must be provided."),
      }),
      s.db.add({
        table: document,
        row: {
          title: inp("title"),
          content: inp("content"),
          media_data: inp("media_data"),
          mime_type: inp("mime_type"),
          metadata: inp("metadata"),
          status: c.text("pending"),
          chunk_count: c.int(0),
          strategy: inp("strategy"),
          chunk_size: inp("chunk_size"),
          chunk_overlap: inp("chunk_overlap"),
          ...(opts.authenticated && opts.authTable ? { user_id: auth("id") } : {}),
        },
        as: "created_doc",
      }),
      s.function.run({
        fn: ingestFn,
        input: {
          document_id: ref("created_doc.id"),
        },
        as: "ingest_res",
      }),
      s.db.get({
        table: document,
        fieldValue: ref("created_doc.id"),
        as: "final_doc",
      }),
    ],
    response: obj({
      document: ref("final_doc"),
      chunk_count: ref("ingest_res.chunk_count"),
      status: ref("ingest_res.status"),
    }),
    responseShape: {} as CreateDocumentResult,
  });

  const listEndpoint = query({
    name: `${prefix}/documents`,
    verb: "GET",
    apiGroup: group,
    auth: authGate,
    description: "List uploaded documents and media assets with pagination.",
    tags: opts.tags,
    input: {
      page: input.int({
        default: 1,
        description: "Page number (1-based).",
      }),
      per_page: input.int({
        default: 20,
        description: "Number of documents per page.",
      }),
    },
    stack: [
      s.db.query({
        table: document,
        where: authWhere(opts),
        sort: [{ sortBy: "created_at", dir: "desc" }],
        paging: {
          page: inp("page"),
          per_page: inp("per_page"),
        },
        as: "docs",
      }),
    ],
    response: ref("docs"),
    responseShape: {} as ListDocumentsResult,
  });

  const getEndpoint = query({
    name: `${prefix}/documents/{id}`,
    verb: "GET",
    apiGroup: group,
    auth: authGate,
    description: "Get a specific document record along with all its vector chunks.",
    tags: opts.tags,
    input: {
      id: input.int({
        required: true,
        description: "Document ID.",
      }),
    },
    stack: [
      s.db.get({
        table: document,
        fieldValue: inp("id"),
        as: "doc",
      }),
      s.precondition({
        expr: expr(ref("doc"), "!=", c.null()),
        error_type: "notfound",
        error: c.text("Document not found."),
      }),
      ...(opts.authenticated && opts.authTable
        ? [
            s.precondition({
              expr: expr(ref("doc.user_id", { safe: true }), "=", auth("id")),
              error_type: "notfound",
              error: c.text("Document not found."),
            }),
          ]
        : []),
      s.db.query({
        table: chunk,
        where: expr(col("document_id"), "=", ref("doc.id")),
        sort: [{ sortBy: "chunk_index", dir: "asc" }],
        as: "chunks",
      }),
    ],
    response: obj({
      document: ref("doc"),
      chunks: ref("chunks"),
    }),
    responseShape: {} as GetDocumentResult,
  });

  const deleteEndpoint = query({
    name: `${prefix}/documents/{id}/delete`,
    verb: "DELETE",
    apiGroup: group,
    auth: authGate,
    description: "Delete a document and all of its associated vector chunks.",
    tags: opts.tags,
    input: {
      id: input.int({
        required: true,
        description: "Document ID to delete.",
      }),
    },
    stack: [
      s.db.get({
        table: document,
        fieldValue: inp("id"),
        as: "doc",
      }),
      s.precondition({
        expr: expr(ref("doc"), "!=", c.null()),
        error_type: "notfound",
        error: c.text("Document not found."),
      }),
      ...(opts.authenticated && opts.authTable
        ? [
            s.precondition({
              expr: expr(ref("doc.user_id", { safe: true }), "=", auth("id")),
              error_type: "notfound",
              error: c.text("Document not found."),
            }),
          ]
        : []),
      s.db.bulk.delete({
        table: chunk,
        where: expr(col("document_id"), "=", ref("doc.id")),
      }),
      s.db.del({
        table: document,
        fieldValue: ref("doc.id"),
      }),
    ],
    response: obj({
      deleted: c.bool(true),
      id: ref("doc.id"),
    }),
    responseShape: {} as DeleteDocumentResult,
  });

  const reindexEndpoint = query({
    name: `${prefix}/documents/{id}/reindex`,
    verb: "POST",
    apiGroup: group,
    auth: authGate,
    description: "Re-chunk and re-embed an existing document with updated chunking parameters.",
    tags: opts.tags,
    input: {
      id: input.int({
        required: true,
        description: "Document ID to reindex.",
      }),
      strategy: input.enum(CHUNK_STRATEGIES, {
        required: false,
        description: "New chunking algorithm (fixed, paragraph, sentence, markdown, custom).",
      }),
      chunk_size: input.int({
        required: false,
        description: "Updated target chunk size.",
      }),
      chunk_overlap: input.int({
        required: false,
        description: "Updated chunk overlap.",
      }),
    },
    stack: [
      s.db.get({
        table: document,
        fieldValue: inp("id"),
        as: "doc",
      }),
      s.precondition({
        expr: expr(ref("doc"), "!=", c.null()),
        error_type: "notfound",
        error: c.text("Document not found."),
      }),
      ...(opts.authenticated && opts.authTable
        ? [
            s.precondition({
              expr: expr(ref("doc.user_id", { safe: true }), "=", auth("id")),
              error_type: "notfound",
              error: c.text("Document not found."),
            }),
          ]
        : []),
      setVar(
        "new_strategy",
        withFilters(inp("strategy"), [fl.first_notempty(ref("doc.strategy"))]),
      ),
      setVar(
        "new_size",
        withFilters(inp("chunk_size"), [fl.first_notempty(ref("doc.chunk_size"))]),
      ),
      setVar(
        "new_overlap",
        withFilters(inp("chunk_overlap"), [fl.first_notempty(ref("doc.chunk_overlap"))]),
      ),
      s.db.edit({
        table: document,
        fieldValue: ref("doc.id"),
        row: {
          strategy: ref("new_strategy"),
          chunk_size: ref("new_size"),
          chunk_overlap: ref("new_overlap"),
        },
      }),
      s.function.run({
        fn: ingestFn,
        input: {
          document_id: ref("doc.id"),
        },
        as: "ingest_res",
      }),
    ],
    response: ref("ingest_res"),
    responseShape: {} as ReindexDocumentResult,
  });

  return {
    create: createEndpoint,
    createDocument: createEndpoint,
    list: listEndpoint,
    listDocuments: listEndpoint,
    get: getEndpoint,
    getDocument: getEndpoint,
    delete: deleteEndpoint,
    deleteDocument: deleteEndpoint,
    reindex: reindexEndpoint,
    reindexDocument: reindexEndpoint,
    all: [
      createEndpoint,
      listEndpoint,
      getEndpoint,
      deleteEndpoint,
      reindexEndpoint,
    ] as const,
  };
}
