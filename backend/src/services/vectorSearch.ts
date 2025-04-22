import { pool } from '../config/database';

interface Chunk {
    id: number;
    content: string;
    embedding: number[];
}

interface SimilarChunk extends Chunk {
    similarity: number;
}

export async function findSimilarChunks(queryEmbedding: number[], limit: number = 5): Promise<SimilarChunk[]> {
    // Get all chunks with their embeddings
    const result = await pool.query(
        `SELECT id, content, embedding 
         FROM document_chunks`
    );

    // Calculate cosine similarity for each chunk
    const similarities = result.rows.map((chunk: Chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by similarity and return top results
    return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}

function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
} 