// backend/src/models/document.model.ts
import { query } from '../config/database';
import { generateEmbedding } from '../services/embedding.services';
import debug from 'debug';

const log = debug('app:document-model');

interface CreateDocumentParams {
  user_id: number;
  filename: string;
  file_url: string;
  file_type: string;
  embedding: number[];
  content: string;
}

export const createDocument = async (params: CreateDocumentParams): Promise<number> => {
  let client;
  try {
    log('Creating document with params:', {
      userId: params.user_id,
      filename: params.filename,
      fileType: params.file_type,
      contentLength: params.content.length
    });

    // Format the embedding array as a string with square brackets
    const formattedEmbedding = `[${params.embedding.join(',')}]`;
    log('Formatted embedding:', {
      length: params.embedding.length,
      preview: formattedEmbedding.substring(0, 100) + '...'
    });

    // Get a client from the pool
    client = await query('BEGIN');

    // Insert the document
    const result = await query(
      `INSERT INTO documents (user_id, filename, file_url, file_type, embedding, status)
       VALUES ($1, $2, $3, $4, $5, 'PROCESSING')
       RETURNING id`,
      [params.user_id, params.filename, params.file_url, params.file_type, formattedEmbedding]
    );

    const documentId = result.rows[0].id;
    log('Document created with ID:', documentId);

    // Split content into chunks and process them
    const chunkSize = 1000; // characters per chunk
    const chunks = [];
    
    for (let i = 0; i < params.content.length; i += chunkSize) {
      chunks.push(params.content.slice(i, i + chunkSize));
    }

    log('Split content into chunks:', chunks.length);

    // Process chunks one at a time
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkEmbedding = await generateEmbedding(chunk);
      const formattedChunkEmbedding = `[${chunkEmbedding.join(',')}]`;

      // Convert chunk to Buffer for BYTEA storage
      const chunkBuffer = Buffer.from(chunk, 'utf8');

      await query(
        `INSERT INTO document_chunks (document_id, chunk_number, content, embedding)
         VALUES ($1, $2, $3, $4)`,
        [documentId, i + 1, chunkBuffer, formattedChunkEmbedding]
      );

      log(`Processed chunk ${i + 1}/${chunks.length}`);
    }

    // Update document status to COMPLETED
    await query(
      `UPDATE documents SET status = 'COMPLETED' WHERE id = $1`,
      [documentId]
    );

    // Commit the transaction
    await query('COMMIT');
    log('Transaction committed successfully');

    return documentId;
  } catch (error) {
    // Rollback the transaction if anything fails
    if (client) {
      await query('ROLLBACK');
      log('Transaction rolled back due to error');
    }
    log('Error in createDocument:', error);
    throw error;
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