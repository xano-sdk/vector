# @xano-sdk/vector

[![npm version](https://img.shields.io/npm/v/@xano-sdk/vector.svg)](https://www.npmjs.com/package/@xano-sdk/vector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A vector embedding, document ingestion, chunking, and semantic search module for [Xano SDK](https://github.com/xanots/sdk). It uses Google Gemini Embeddings 2 (`gemini-embedding-2`) at **768 dimensions**, stores vectors in PostgreSQL `pgvector` with a cosine index, and ships an AI agent search tool.

Everything it exports is a typed Xano SDK def. Nothing runs inside this package; your workspace compiles the defs at `export()`.

---

## Features

- **Gemini Embeddings 2**: text, images (PNG, JPEG, WebP), audio (WAV, MP3), and video (MP4), reduced to **768 dimensions** with Matryoshka Representation Learning (MRL).
- **Asymmetric retrieval**: documents are embedded as `RETRIEVAL_DOCUMENT` and queries as `RETRIEVAL_QUERY` by default.
- **Cross-modal search**: text-to-text, text-to-image, and image-to-image search by cosine similarity (`vector_cosine_ops`).
- **Chunking strategies**: `paragraph`, `sentence`, `markdown`, `fixed`, and `custom`, with configurable chunk size and overlap.
- **Document lifecycle**: `pending`, `indexing`, `indexed`, `failed`, with chunk storage and reindexing.
- **Agent tool**: a `vector_search` tool for Xano agents and MCP servers, with configurable citation style.
- **Typed client**: request and response types for every endpoint.

---

## Installation

With the Xano SDK CLI, which installs the package and wires it into `xano/index.ts`:

```bash
xanosdk marketplace install @xano-sdk/vector
# or, for a new project:
xanosdk init my-app --marketplace @xano-sdk/vector
```

Or manually:

```bash
npm install @xano-sdk/vector @xano/sdk
```

Requires `@xano/sdk` `>=1.0.0 <2.0.0`.

---

## Quickstart

```ts
// xano/index.ts
import { workspace, workspaceConfig } from "@xano/sdk";
import { registerVector } from "@xano-sdk/vector";

const ws = workspace("my-app").registerWorkspace(
  workspaceConfig({ name: "my-app", env: { GEMINI_API_KEY: "" } }),
);

export const vector = registerVector(ws, { defaultStrategy: "markdown" });

export default vector.xano;
```

Declare the env var name in source and put its value in `xano/.env`, which is gitignored:

```bash
# xano/.env
GEMINI_API_KEY=your-google-ai-studio-key
```

Do not write `process.env.GEMINI_API_KEY` into `workspaceConfig`. It is read at export time, so the key's value ends up in the bundle.

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKeyEnv` | `string` | `"GEMINI_API_KEY"` | Name of the workspace env var that holds the Gemini API key. |
| `model` | `string` | `"gemini-embedding-2"` | Gemini embedding model id. |
| `taskTypeDocument` | `string` | `"RETRIEVAL_DOCUMENT"` | Gemini `taskType` used when embedding documents. |
| `taskTypeQuery` | `string` | `"RETRIEVAL_QUERY"` | Gemini `taskType` used when embedding search queries. |
| `defaultStrategy` | `ChunkStrategy` | `"paragraph"` | `fixed`, `paragraph`, `sentence`, `markdown`, or `custom`. |
| `defaultChunkSize` | `number` | `500` | Target characters per chunk (integer, 20 to 10000). |
| `defaultChunkOverlap` | `number` | `50` | Characters shared by consecutive chunks (integer, `>= 0` and `< defaultChunkSize`). |
| `searchLimit` | `number` | `10` | Default top-k for search (integer, 1 to 100). |
| `searchThreshold` | `number` | `0.0` | Default minimum cosine similarity (0.0 to 1.0). |
| `citationFormat` | `"markdown" \| "numeric" \| "none"` | `"markdown"` | How the agent tool tells the model to cite sources. |
| `authTable` | `TableDef \| string` | `undefined` | Auth table that owns documents. Required when `authenticated` is `true`. |
| `authenticated` | `boolean` | `true` if `authTable` is set, else `false` | Require a signed-in user on every endpoint and scope documents to their owner. |
| `userIdType` | `"int" \| "uuid"` | inferred from `authTable` | Type of the `user_id` column. |
| `routePrefix` | `string` | `"vector"` | Path prefix for the endpoints. |
| `canonical` | `string` | `undefined` | API group canonical (`/api:<canonical>`). Also replaces `routePrefix` and prefixes def names (`<canonical>_document`, `<canonical>/search_vectors`, …). |
| `names` | `VectorNames` | see `DEFAULT_NAMES` | Override individual table, function, tool, and API group names. |
| `tags` | `string[]` | `["vector", "ai", "search"]` | Tags on the API group. |

### Authentication

```ts
export const vector = registerVector(ws, { authTable: users, canonical: "kb" });
```

When `authenticated` is on, every endpoint requires a signed-in user. Documents get a `user_id` column, and the list, get, delete, and reindex endpoints only return the caller's own documents.

`/search`, `/embed`, and the `vector_search` tool also require sign-in, but search runs across **all** indexed chunks, not only the caller's. Do not rely on it to keep one user's content away from another user.

---

## API Endpoints

The endpoints live in one API group, at `https://<your-instance>/api:<canonical>/<routePrefix>/...`. Without a `canonical` option, Xano assigns the group's canonical on deploy. With `canonical: "kb"`, the base is `/api:kb/kb/`.

| Verb | Path | Inputs | Returns |
| :--- | :--- | :--- | :--- |
| `POST` | `/documents/create` | `title`, `content?`, `media_data?`, `mime_type?`, `metadata?`, `strategy?`, `chunk_size?`, `chunk_overlap?` | `{ document, chunk_count, status }` |
| `GET` | `/documents` | `page?` (1), `per_page?` (20) | Paged `{ items, curPage, perPage, itemsReceived, itemsTotal, pageTotal }` |
| `GET` | `/documents/{id}` | `id` | `{ document, chunks }` |
| `DELETE` | `/documents/{id}/delete` | `id` | `{ deleted, id }`. Deletes the document's chunks too. |
| `POST` | `/documents/{id}/reindex` | `id`, `strategy?`, `chunk_size?`, `chunk_overlap?` | `{ document_id, status, chunk_count }` |
| `POST` | `/search` | `query?`, `query_media_data?`, `query_mime_type?`, `query_embedding?`, `limit?`, `threshold?` | `{ results, count }` |
| `POST` | `/embed` | `text?`, `media_data?`, `mime_type?`, `model?` | `{ embedding, dimensions }` |

`media_data` is base64. `mime_type` defaults to `text/plain`. Send the user's auth token as `Authorization: Bearer <token>` when `authenticated` is on.

The examples below use `const API = "https://<your-instance>/api:<canonical>/<routePrefix>";`.

---

## Examples

### Ingest a text document

```ts
await fetch(`${API}/documents/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "System Architecture Guide",
    content: "# System Architecture\nOur service runs on Kubernetes with PostgreSQL...",
    mime_type: "text/markdown",
    strategy: "markdown",
    chunk_size: 400,
    chunk_overlap: 40,
  }),
});
```

### Ingest an image, audio, or video file

```ts
await fetch(`${API}/documents/create`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Product Diagram",
    content: "Diagram illustrating cloud sync architecture.",
    media_data: "<base64_image_data>",
    mime_type: "image/png",
    metadata: { category: "diagrams", width: 1024, height: 768 },
  }),
});
```

### Search

```ts
const res = await fetch(`${API}/search`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "architecture diagrams explaining cloud sync", limit: 5 }),
});
const { results, count } = await res.json();
```

Send `query_media_data` + `query_mime_type` to search with an image or audio clip, or `query_embedding` to search with a 768-dim vector you already have.

---

## AI Agent Search Tool

Pass `vector.searchTool` in an agent's or MCP server's `tools`:

```ts
import { agent } from "@xano/sdk";

export const supportAgent = agent({
  name: "support_agent",
  llm: {
    type: "google-genai",
    model: "gemini-2.5-flash",
    apiKey: "{{ $env.GEMINI_API_KEY }}",
    systemPrompt: "Answer questions using the vector_search tool. Cite your sources.",
  },
  tools: [vector.searchTool],
});

ws.registerAgents([supportAgent]);
```

The tool takes `query`, optional `media_data` / `mime_type`, and `limit` (default 5).

---

## Building defs without registering

`createVector(options)` returns the same defs as `registerVector` without touching a workspace: `document`, `chunk`, `embedFn`, `chunkFn`, `ingestFn`, `searchFn`, `searchTool`, `group`, and `queries`. The individual factories (`documentTable`, `chunkTable`, `generateEmbeddingFn`, …) are exported too.

Call `registerVector` once per workspace; a second call throws. To run two pipelines in one workspace, register the second set yourself from `createVector` with a different `canonical` and `names.searchTool` (the tool name is not derived from `canonical`).

---

## License

MIT
