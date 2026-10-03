/**
 * The `Vector` API group def.
 */
import { apiGroup } from "@xano/sdk";
import type { ResolvedOptions } from "../options.js";

/** Build the API group for the vector endpoints. */
export function vectorGroup(opts: ResolvedOptions) {
  return apiGroup({
    name: opts.names.apiGroup,
    canonical: opts.canonical,
    description: "Vector embedding pipeline, document ingestion, and similarity search endpoints.",
    tags: opts.tags,
  });
}

/** The `vectorGroup` def type. */
export type VectorGroup = ReturnType<typeof vectorGroup>;
