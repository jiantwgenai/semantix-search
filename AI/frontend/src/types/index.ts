// Document types
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

// Search result types
export interface SearchResult {
  id: number;
  filename: string;
  file_type: string;
  file_url: string;
  created_at: string;
  preview: PreviewContent;
  similarity: number;
}

// Mock data for development
export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 1,
    name: "Project Proposal 2023.pdf",
    type: "pdf",
    url: "#",
    uploadDate: "2023-04-15T14:30:00Z"
  },
  {
    id: 2,
    name: "Q4 Financial Report.docx",
    type: "docx",
    url: "#",
    uploadDate: "2023-05-22T09:15:00Z"
  },
  {
    id: 3,
    name: "User Research Findings.pptx",
    type: "pptx",
    url: "#",
    uploadDate: "2023-06-10T16:45:00Z"
  },
  {
    id: 4,
    name: "API Documentation.txt",
    type: "txt",
    url: "#",
    uploadDate: "2023-06-28T11:20:00Z"
  },
  {
    id: 5,
    name: "Product Roadmap 2023-2024.pdf",
    type: "pdf",
    url: "#",
    uploadDate: "2023-07-05T13:10:00Z"
  }
];
