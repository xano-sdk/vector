/**
 * Request and response payload interfaces for the Vector API Group endpoints.
 */
import type { PublicDocument } from "../tables/document.js";
import type { PublicChunk } from "../tables/chunk.js";
import type { SearchHit } from "../functions/search.js";

export interface CreateDocumentPayload {
  title: string;
  content?: string;
  media_data?: string;
  mime_type?: string;
  metadata?: Record<string, unknown>;
  strategy?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface CreateDocumentResult {
  document: PublicDocument;
  chunk_count: number;
  status: string;
}

export interface ListDocumentsPayload {
  page?: number;
  per_page?: number;
  status?: string;
}

export interface ListDocumentsResult {
  items: PublicDocument[];
  curPage: number;
  perPage: number;
  itemsReceived: number;
  itemsTotal: number;
  pageTotal: number;
}

export interface GetDocumentResult {
  document: PublicDocument;
  chunks: PublicChunk[];
}

export interface DeleteDocumentResult {
  deleted: boolean;
  id: number;
}

export interface ReindexDocumentPayload {
  strategy?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface ReindexDocumentResult {
  document_id: number;
  status: string;
  chunk_count: number;
}

export interface SearchPayload {
  query?: string;
  query_media_data?: string;
  query_mime_type?: string;
  query_embedding?: number[];
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  results: SearchHit[];
  count: number;
}

export interface EmbedPayload {
  text?: string;
  media_data?: string;
  mime_type?: string;
  model?: string;
}

export interface EmbedResult {
  embedding: number[];
  dimensions: number;
}
