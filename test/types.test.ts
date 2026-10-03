import { describe, it, expect } from "vitest";
import type { InferResponse, StackTupleWidened } from "@xano/sdk";
import { createVector } from "../src/index.js";
import type {
  CreateDocumentResponse,
  ListDocumentsResponse,
  GetDocumentResponse,
  DeleteDocumentResponse,
  ReindexDocumentResponse,
  SearchResponse,
  EmbedResponse,
  VectorEndpoints,
} from "../src/index.js";
import { testUserTable } from "./helpers.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Not<T extends boolean> = T extends true ? false : true;
type IsWidened<T> = Equal<T, StackTupleWidened>;
const assertType = <_T extends true>(): void => {};

const vec = createVector({ authTable: testUserTable, authenticated: true });

describe("type tests", () => {
  it("verifies endpoints have not widened to StackTupleWidened", () => {
    type CreateResp = InferResponse<typeof vec.documents.createDocument>;
    type ListResp = InferResponse<typeof vec.documents.listDocuments>;
    type GetResp = InferResponse<typeof vec.documents.getDocument>;
    type DelResp = InferResponse<typeof vec.documents.deleteDocument>;
    type ReindexResp = InferResponse<typeof vec.documents.reindexDocument>;
    type SearchResp = InferResponse<typeof vec.search.search>;
    type EmbedResp = InferResponse<typeof vec.search.embed>;

    assertType<Not<IsWidened<CreateResp>>>();
    assertType<Not<IsWidened<ListResp>>>();
    assertType<Not<IsWidened<GetResp>>>();
    assertType<Not<IsWidened<DelResp>>>();
    assertType<Not<IsWidened<ReindexResp>>>();
    assertType<Not<IsWidened<SearchResp>>>();
    assertType<Not<IsWidened<EmbedResp>>>();

    expect(vec).toBeDefined();
  });

  it("verifies client response types align with endpoint responses", () => {
    type _CreateMatches = Equal<CreateDocumentResponse, InferResponse<typeof vec.documents.createDocument>>;
    type _ListMatches = Equal<ListDocumentsResponse, InferResponse<typeof vec.documents.listDocuments>>;
    type _GetMatches = Equal<GetDocumentResponse, InferResponse<typeof vec.documents.getDocument>>;
    type _DelMatches = Equal<DeleteDocumentResponse, InferResponse<typeof vec.documents.deleteDocument>>;
    type _ReindexMatches = Equal<ReindexDocumentResponse, InferResponse<typeof vec.documents.reindexDocument>>;
    type _SearchMatches = Equal<SearchResponse, InferResponse<typeof vec.search.search>>;
    type _EmbedMatches = Equal<EmbedResponse, InferResponse<typeof vec.search.embed>>;
    type _EndpointsDefined = keyof VectorEndpoints extends string ? true : false;

    assertType<_CreateMatches>();
    assertType<_ListMatches>();
    assertType<_GetMatches>();
    assertType<_DelMatches>();
    assertType<_ReindexMatches>();
    assertType<_SearchMatches>();
    assertType<_EmbedMatches>();
    assertType<_EndpointsDefined>();

    expect(vec.documents.createDocument).toBeDefined();
  });
});
