export interface Document {
    id: number;
    user_id: number;
    filename: string;
    file_type: string;
    file_url: string;
    created_at: string;
    preview?: string;
    similarity?: number;
} 