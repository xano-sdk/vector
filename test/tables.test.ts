import { describe, it, expect } from "vitest";
import { exportWith, tableRow, column, testUserTable } from "./helpers.js";

describe("document table", () => {
  it("encodes document table correctly without auth", () => {
    const payload = exportWith({});
    const doc = tableRow(payload, "vector_document");
    expect(doc).toBeDefined();
    expect(column(doc, "title")).toBeDefined();
    expect(column(doc, "content")).toBeDefined();
    expect(column(doc, "media_data")).toBeDefined();
    expect(column(doc, "mime_type")).toBeDefined();
    expect(column(doc, "status")).toBeDefined();
    expect(column(doc, "chunk_count")).toBeDefined();
    expect(column(doc, "strategy")).toBeDefined();
    expect(column(doc, "chunk_size")).toBeDefined();
    expect(column(doc, "chunk_overlap")).toBeDefined();
  });

  it("encodes document table with user_id when authTable is provided", () => {
    const payload = exportWith({ authTable: testUserTable, authenticated: true });
    const doc = tableRow(payload, "vector_document");
    expect(doc).toBeDefined();
    const userIdCol = column(doc, "user_id");
    expect(userIdCol).toBeDefined();
    expect(doc.index.some((idx: any) => idx.fields.some((f: any) => f.name === "user_id"))).toBe(true);
  });
});

describe("chunk table", () => {
  it("encodes chunk table with 768-dim vector and vector cosine index", () => {
    const payload = exportWith({});
    const chunk = tableRow(payload, "vector_chunk");
    expect(chunk).toBeDefined();

    const embeddingCol = column(chunk, "embedding");
    expect(embeddingCol).toBeDefined();
    expect(embeddingCol.type).toBe("vector");
    expect(embeddingCol.vector.size).toBe(768);

    expect(column(chunk, "content")).toBeDefined();
    expect(column(chunk, "mime_type")).toBeDefined();

    const vectorIndex = chunk.index.find((idx: any) => idx.type === "vector");
    expect(vectorIndex).toBeDefined();
    expect(vectorIndex.fields[0].name).toBe("embedding");
    expect(vectorIndex.fields[0].op).toBe("vector_cosine_ops");

    const btreeIndex = chunk.index.find(
      (idx: any) =>
        idx.type === "btree" &&
        idx.fields.some((f: any) => f.name === "document_id") &&
        idx.fields.some((f: any) => f.name === "chunk_index"),
    );
    expect(btreeIndex).toBeDefined();
  });
});
