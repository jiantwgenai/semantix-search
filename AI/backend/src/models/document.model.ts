// backend/src/models/document.model.ts
import { query } from '../config/database';
import { generateEmbedding } from '../services/embedding.services';
import debug from 'debug';

const log = debug('app:document-model');

interface DocumentData {
  user_id: number;
  filename: string;
  file_url: string;
  file_type: string;
  embedding: number[];
  content: string;
  extracted_text?: string;
}

export const createDocument = async (data: DocumentData): Promise<number> => {
  try {
    // Create document record
    const result = await query(
      `INSERT INTO documents (user_id, filename, file_url, file_type, embedding)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.user_id, 
        data.filename, 
        data.file_url, 
        data.file_type, 
        Array.isArray(data.embedding) ? `[${data.embedding.join(',')}]` : data.embedding
      ]
    );

    const documentId = result.rows[0].id;
    
    // Use extracted text if available
    const textContent = data.extracted_text || data.content;

    // Create chunks of the text content
    const chunkSize = 1000;
    const chunks = [];
    
    for (let i = 0; i < textContent.length; i += chunkSize) {
      chunks.push(textContent.slice(i, i + chunkSize));
    }

    if (chunks.length === 0) {
      chunks.push(data.filename);
    }

    // Insert chunks
    await Promise.all(chunks.map(async (chunk, index) => {
      const chunkEmbedding = await generateEmbedding(chunk);
      const chunkBuffer = Buffer.from(chunk, 'utf8');

      await query(
        `INSERT INTO document_chunks (document_id, chunk_number, content, embedding)
         VALUES ($1, $2, $3, $4)`,
        [
          documentId, 
          index + 1, 
          chunkBuffer, 
          Array.isArray(chunkEmbedding) ? `[${chunkEmbedding.join(',')}]` : chunkEmbedding
        ]
    );
    }));

    return documentId;
  } catch (error) {
    console.error('Error creating document:', error);
    throw new Error(`Failed to create document: ${error}`);
  }
};

export const findDocumentById = async (id: number): Promise<any> => {
  try {
    const result = await query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );
    return result.rows[0];
  } catch (error) {
    log('Error finding document:', error);
    throw error;
  }
};