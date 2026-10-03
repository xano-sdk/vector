/**
 * Fully typed client-side interface describing the Vector API endpoints.
 */
import type {
  CreateDocumentPayload,
  CreateDocumentResult,
  ListDocumentsPayload,
  ListDocumentsResult,
  GetDocumentResult,
  DeleteDocumentResult,
  ReindexDocumentPayload,
  ReindexDocumentResult,
  SearchPayload,
  SearchResult,
  EmbedPayload,
  EmbedResult,
} from "./types.js";

export type CreateDocumentBody = CreateDocumentPayload;
export type CreateDocumentInput = CreateDocumentPayload;
export type CreateDocumentResponse = CreateDocumentResult;

export type ListDocumentsQuery = ListDocumentsPayload;
export type ListDocumentsInput = ListDocumentsPayload;
export type ListDocumentsResponse = ListDocumentsResult;

export type GetDocumentParams = { id: number };
export type GetDocumentInput = { id: number };
export type GetDocumentResponse = GetDocumentResult;

export type DeleteDocumentParams = { id: number };
export type DeleteDocumentInput = { id: number };
export type DeleteDocumentResponse = DeleteDocumentResult;

export type ReindexDocumentParams = { id: number };
export type ReindexDocumentBody = ReindexDocumentPayload;
export type ReindexDocumentInput = { id: number } & ReindexDocumentPayload;
export type ReindexDocumentResponse = ReindexDocumentResult;

export type SearchBody = SearchPayload;
export type SearchInput = SearchPayload;
export type SearchResponse = SearchResult;

export type EmbedBody = EmbedPayload;
export type EmbedInput = EmbedPayload;
export type EmbedResponse = EmbedResult;

export interface VectorClientEndpoints {
  "POST /documents/create": {
    request: CreateDocumentPayload;
    response: CreateDocumentResult;
  };
  "GET /documents": {
    request: ListDocumentsPayload;
    response: ListDocumentsResult;
  };
  "GET /documents/:id": {
    request: { id: number };
    response: GetDocumentResult;
  };
  "DELETE /documents/:id/delete": {
    request: { id: number };
    response: DeleteDocumentResult;
  };
  "POST /documents/:id/reindex": {
    request: { id: number } & ReindexDocumentPayload;
    response: ReindexDocumentResult;
  };
  "POST /search": {
    request: SearchPayload;
    response: SearchResult;
  };
  "POST /embed": {
    request: EmbedPayload;
    response: EmbedResult;
  };
}

export type VectorEndpointName = keyof VectorClientEndpoints;
export type VectorEndpoints = VectorClientEndpoints;
export type VectorEndpoint<K extends VectorEndpointName> = VectorClientEndpoints[K];
