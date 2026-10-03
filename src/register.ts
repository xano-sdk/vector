/**
 * `createVector(opts)` — builds every def for one configuration.
 * `registerVector(xano, opts)` — builds and registers all defs on a Xano instance.
 */
import type { Xano, AnyFunctionDef, AnyQueryDef } from "@xano/sdk";
import { resolveOptions, type VectorOptions, type ResolvedOptions } from "./options.js";
import { documentTable } from "./tables/document.js";
import { chunkTable } from "./tables/chunk.js";
import { generateEmbeddingFn } from "./functions/embed.js";
import { chunkTextFn } from "./functions/chunk.js";
import { ingestDocumentFn } from "./functions/ingest.js";
import { searchVectorsFn } from "./functions/search.js";
import { vectorSearchTool } from "./tool/vector-search-tool.js";
import { vectorGroup } from "./api/group.js";
import { documentQueries } from "./api/documents.js";
import { searchQueries } from "./api/search.js";

/** Instances that have already had a vector module registered. */
const installed = new WeakSet<Xano>();

/** Document management endpoint family. */
export type DocumentFamily = ReturnType<typeof documentQueries>;
/** Search & embedding endpoint family. */
export type SearchFamily = ReturnType<typeof searchQueries>;

/** Everything one `createVector` call produces. */
export interface Vector {
  options: ResolvedOptions;
  document: ReturnType<typeof documentTable>;
  chunk: ReturnType<typeof chunkTable>;
  embedFn: ReturnType<typeof generateEmbeddingFn>;
  chunkFn: ReturnType<typeof chunkTextFn>;
  ingestFn: ReturnType<typeof ingestDocumentFn>;
  searchFn: ReturnType<typeof searchVectorsFn>;
  searchTool: ReturnType<typeof vectorSearchTool>;
  group: ReturnType<typeof vectorGroup>;
  documents: DocumentFamily;
  search: SearchFamily;
  queries: (DocumentFamily["all"][number] | SearchFamily["all"][number])[];
}

/**
 * Build the full vector def set without registering anything.
 *
 * Use this to cherry-pick specific defs or wire custom combinations.
 */
export function createVector(opts: VectorOptions = {}): Vector {
  const options = resolveOptions(opts);

  const document = documentTable(options);
  const chunk = chunkTable(options, document);
  const embedFn = generateEmbeddingFn(options);
  const chunkFn = chunkTextFn(options);
  const ingestFn = ingestDocumentFn(options, document, chunk, embedFn, chunkFn);
  const searchFn = searchVectorsFn(options, chunk, embedFn);
  const searchTool = vectorSearchTool(options, searchFn);
  const group = vectorGroup(options);
  const documents = documentQueries(options, group, document, chunk, ingestFn);
  const search = searchQueries(options, group, searchFn, embedFn);

  return {
    options,
    document,
    chunk,
    embedFn,
    chunkFn,
    ingestFn,
    searchFn,
    searchTool,
    group,
    documents,
    search,
    queries: [...documents.all, ...search.all],
  };
}

/** What `registerVector` returns: the def set, plus the Xano instance. */
export interface RegisteredVector<X extends Xano> extends Vector {
  xano: X;
}

/**
 * Build and register the full vector embedding & search pipeline on the given instance.
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
export function registerVector<X extends Xano>(
  xano: X,
  opts: VectorOptions = {},
): RegisteredVector<X> {
  if (installed.has(xano)) {
    throw new Error(
      "registerVector: already called on this Xano instance. Register the vector set once — a second " +
        "registration duplicates every def, which the SDK cannot catch (the two sets are distinct objects " +
        'sharing names) and which surfaces at export() as "Duplicate object guid … shared by ' +
        '\\"dbo/vector_document\\" and \\"dbo/vector_document\\"". To run TWO vector pipelines in one workspace, ' +
        "build the second with `createVector({ canonical, names: { searchTool } })` and register its defs yourself.",
    );
  }

  const vec = createVector(opts);

  xano
    .registerTables([vec.document, vec.chunk])
    .registerFunctions([
      vec.embedFn as unknown as AnyFunctionDef,
      vec.chunkFn as unknown as AnyFunctionDef,
      vec.ingestFn as unknown as AnyFunctionDef,
      vec.searchFn as unknown as AnyFunctionDef,
    ])
    .registerTools([vec.searchTool])
    .registerApiGroups([vec.group])
    .registerQueries(vec.queries as AnyQueryDef[]);

  installed.add(xano);
  return { ...vec, xano };
}
