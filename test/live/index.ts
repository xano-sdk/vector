// The workspace `npm run test:live` deploys. `live/seed` exists only here: it stores a chunk with a known vector,
// so search can be proven without a Gemini key.
import { apiGroup, c, inp, input, query, ref, s, workspace, workspaceConfig } from "@xano/sdk";
import { registerVector } from "../../src/index.js";

const ws = workspace("vector-live").registerWorkspace(workspaceConfig({ name: "vector-live", env: { GEMINI_API_KEY: "" } }));
const vector = registerVector(ws, { defaultStrategy: "markdown", canonical: "vector" });
const live = apiGroup({ name: "Live", canonical: "live" });

const seed = query({
  name: "live/seed",
  verb: "POST",
  apiGroup: live,
  input: { title: input.text({ required: true }), embedding: input.vector(768, { required: true }) },
  stack: [
    s.db.add({
      table: vector.document,
      row: { title: inp("title"), content: inp("title"), status: c.text("indexed"), chunk_count: c.int(1) },
      as: "doc",
    }),
    s.db.add({
      table: vector.chunk,
      row: { document_id: ref("doc.id"), document_title: inp("title"), chunk_index: c.int(0), content: inp("title"), embedding: inp("embedding") },
      as: "chunk",
    }),
  ],
  response: { ok: c.bool(true) },
});

export default vector.xano.registerApiGroups([live]).registerQueries([seed]);
