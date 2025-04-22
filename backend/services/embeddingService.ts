import axios from 'axios';
import { query } from '../db';

const LLAMA_API_URL = process.env.LLAMA_API_URL || 'http://localhost:8000';

export const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
        const response = await axios.post(`${LLAMA_API_URL}/v1/embeddings`, {
            model: "llama-2-7b", // or any other Llama model you're using
            input: text
        });
        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
};

export const storeDocumentEmbedding = async (documentId: number, embedding: number[]) => {
    await query(
        'UPDATE documents SET embedding = $1 WHERE id = $2',
        [embedding, documentId]
    );
};

export const storeChunkEmbedding = async (chunkId: number, embedding: number[]) => {
    await query(
        'UPDATE document_chunks SET embedding = $1 WHERE id = $2',
        [embedding, chunkId]
    );
};

export const findSimilarChunks = async (queryEmbedding: number[], limit: number = 5) => {
    const result = await query(
        `SELECT dc.*, d.file_name,
        1 - (embedding <=> $1) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        ORDER BY embedding <=> $1
        LIMIT $2`,
        [queryEmbedding, limit]
    );
    return result.rows;
}; 