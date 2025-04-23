export enum DocumentStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Document {
  id: number;
  user_id: number;
  filename: string;
  file_url: string;
  file_type: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: number;
  document_id: number;
  content: string;
  embedding: number[];
  created_at: string;
}

export interface SearchResult {
  document: Document;
  chunk: DocumentChunk;
  similarity: number;
}

export interface PreviewContent {
  type: string;
  data: string;
} 