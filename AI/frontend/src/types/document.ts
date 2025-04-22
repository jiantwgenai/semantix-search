export interface Document {
  id: number;
  name: string;
  type: string;
  url: string;
  uploadDate: string;
}

export interface PreviewContent {
  type: string;
  data: string;
}

export interface SearchResult {
  id: number;
  filename: string;
  file_type: string;
  file_url: string;
  created_at: string;
  preview: PreviewContent;
  similarity: number;
} 