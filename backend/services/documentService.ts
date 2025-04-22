import { query } from '../db';
import AWS from 'aws-sdk';
import { Readable } from 'stream';
import { generateEmbedding, storeDocumentEmbedding, storeChunkEmbedding } from './embeddingService';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const CHUNK_SIZE = 500; // characters per chunk

interface Chunk {
    document_id: number;
    chunk_number: number;
    content: string;
}

export const processDocument = async (file: Express.Multer.File): Promise<number> => {
    try {
        // Upload to S3
        const s3Key = `documents/${Date.now()}-${file.originalname}`;
        await s3.upload({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: s3Key,
            Body: file.buffer
        }).promise();

        // Extract text content based on file type
        let content = '';
        if (file.mimetype === 'application/pdf') {
            // TODO: Implement PDF text extraction
            content = 'PDF content extraction not implemented';
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // TODO: Implement DOCX text extraction
            content = 'DOCX content extraction not implemented';
        } else if (file.mimetype === 'text/plain') {
            content = file.buffer.toString('utf-8');
        }

        // Generate document embedding
        const documentEmbedding = await generateEmbedding(content);

        // Create document record
        const documentResult = await query(
            'INSERT INTO documents (file_name, s3_key, file_type, total_chunks, embedding) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [file.originalname, s3Key, file.mimetype, Math.ceil(content.length / CHUNK_SIZE), documentEmbedding]
        );
        const documentId = documentResult.rows[0].id;

        // Split content into chunks and store
        const chunks: Chunk[] = [];
        for (let i = 0; i < content.length; i += CHUNK_SIZE) {
            chunks.push({
                document_id: documentId,
                chunk_number: Math.floor(i / CHUNK_SIZE) + 1,
                content: content.slice(i, i + CHUNK_SIZE)
            });
        }

        // Batch insert chunks
        const chunkValues = chunks.map((chunk, index) => 
            `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`
        ).join(',');
        
        const chunkParams = chunks.flatMap(chunk => [
            chunk.document_id,
            chunk.chunk_number,
            chunk.content
        ]);

        const chunkResult = await query(
            `INSERT INTO document_chunks (document_id, chunk_number, content) VALUES ${chunkValues} RETURNING id`,
            chunkParams
        );

        // Generate and store embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunkEmbedding = await generateEmbedding(chunks[i].content);
            await storeChunkEmbedding(chunkResult.rows[i].id, chunkEmbedding);
        }

        return documentId;
    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
};

export const getDocumentChunks = async (documentId: number) => {
    const result = await query(
        'SELECT * FROM document_chunks WHERE document_id = $1 ORDER BY chunk_number',
        [documentId]
    );
    return result.rows;
};

export const getDocument = async (documentId: number) => {
    const result = await query(
        'SELECT * FROM documents WHERE id = $1',
        [documentId]
    );
    return result.rows[0];
};

export const searchSimilarChunks = async (query: string, limit: number = 5) => {
    const queryEmbedding = await generateEmbedding(query);
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