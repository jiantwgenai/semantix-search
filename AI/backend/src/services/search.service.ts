import { query } from '../config/database';
import { generateEmbedding } from './embedding.services';
import debug from 'debug';

const log = debug('app:search-service');

export interface SearchResult {
  id: number;
  filename: string;
  file_url: string;
  file_type: string;
  created_at: Date;
  similarity: number;
  content?: string;
  chunk_number?: number;
  preview?: string;
}

// Search configuration
const SEARCH_CONFIG = {
  maxResults: 20,
  similarityThreshold: 0.1,
  previewLength: 200
};

export const searchDocuments = async (queryText: string, userId: number): Promise<SearchResult[]> => {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Log the embedding details
    log('Generated embedding:', {
      length: queryEmbedding.length,
      preview: queryEmbedding.slice(0, 5),
      queryText
    });
    
    const formattedQueryEmbedding = `[${queryEmbedding.join(',')}]`;
    
    // First, verify the vector extension and table structure
    const vectorCheck = await query(`
      SELECT 
        (SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector') as has_vector,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'documents' AND column_name = 'embedding') as has_embedding_column,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'document_chunks' AND column_name = 'embedding') as has_chunk_embedding
    `);

    log('Vector extension check:', vectorCheck.rows[0]);

    if (vectorCheck.rows[0].has_vector === 0) {
      throw new Error('Vector extension is not installed');
    }

    if (vectorCheck.rows[0].has_embedding_column === 0 || vectorCheck.rows[0].has_chunk_embedding === 0) {
      throw new Error('Required embedding columns are missing');
    }

    // Get the actual dimension of the embedding column
    const dimensionCheck = await query(`
      SELECT 
        CASE 
          WHEN udt_name LIKE 'vector%' THEN 
            (SELECT regexp_replace(udt_name, 'vector\\(\\d+\\)', '\\1'))
          ELSE '0'
        END as dimension
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'embedding'
    `);

    let embeddingDimension = parseInt(dimensionCheck.rows[0]?.dimension || '0', 10);
    
    if (embeddingDimension === 0) {
      // If we can't get the dimension from the column definition, try to get it from the first document
      const sampleCheck = await query(`
        SELECT array_length(embedding, 1) as dimension
        FROM documents
        WHERE embedding IS NOT NULL
        LIMIT 1
      `);
      
      const sampleDimension = sampleCheck.rows[0]?.dimension || 0;
      
      if (sampleDimension === 0) {
        throw new Error('Could not determine embedding dimension from database schema or sample data');
      }
      
      log('Using sample dimension:', sampleDimension);
      embeddingDimension = sampleDimension;
    }

    log('Using embedding dimension:', embeddingDimension);

    if (queryEmbedding.length !== embeddingDimension) {
      throw new Error(`Embedding dimension mismatch: query has ${queryEmbedding.length}, database expects ${embeddingDimension}`);
    }

    // First, let's check what documents we have
    const docCheck = await query(`
      SELECT id, filename, array_length(embedding, 1) as dim
      FROM documents
      WHERE user_id = $1 AND embedding IS NOT NULL
    `, [userId]);

    log('Available documents with embeddings:', {
      count: docCheck.rows.length,
      documents: docCheck.rows.map(d => ({ id: d.id, filename: d.filename, dim: d.dim }))
    });

    // Search in both documents and document_chunks using vector similarity
    const sql = `
      WITH document_similarity AS (
        SELECT 
          d.id,
          d.filename,
          d.file_url,
          d.file_type,
          d.created_at,
          1 - (d.embedding <=> $1::vector(${embeddingDimension})) as doc_similarity
        FROM documents d
        WHERE d.user_id = $2
      ),
      chunk_similarity AS (
        SELECT 
          dc.document_id,
          dc.chunk_number,
          dc.content,
          1 - (dc.embedding <=> $1::vector(${embeddingDimension})) as chunk_similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.user_id = $2
      )
      SELECT 
        ds.id,
        ds.filename,
        ds.file_url,
        ds.file_type,
        ds.created_at,
        GREATEST(ds.doc_similarity, cs.chunk_similarity) as similarity,
        cs.content,
        cs.chunk_number,
        CASE 
          WHEN cs.content IS NOT NULL THEN 
            substring(convert_from(cs.content, 'UTF8') from 1 for ${SEARCH_CONFIG.previewLength}) || 
            CASE WHEN length(convert_from(cs.content, 'UTF8')) > ${SEARCH_CONFIG.previewLength} THEN '...' ELSE '' END
          ELSE NULL
        END as preview
      FROM document_similarity ds
      LEFT JOIN chunk_similarity cs ON ds.id = cs.document_id
      WHERE GREATEST(ds.doc_similarity, cs.chunk_similarity) > $3
      ORDER BY similarity DESC
      LIMIT $4
    `;

    log('Executing search query with params:', {
      userId,
      embeddingDimension,
      similarityThreshold: SEARCH_CONFIG.similarityThreshold,
      maxResults: SEARCH_CONFIG.maxResults,
      queryText
    });

    const result = await query(sql, [
      formattedQueryEmbedding, 
      userId,
      SEARCH_CONFIG.similarityThreshold,
      SEARCH_CONFIG.maxResults
    ]);
    
    log('Search results:', {
      resultCount: result.rows.length,
      results: result.rows.map(r => ({
        id: r.id,
        filename: r.filename,
        similarity: r.similarity,
        hasContent: !!r.content,
        hasPreview: !!r.preview
      }))
    });

    return result.rows;
  } catch (error) {
    log('Error in searchDocuments:', error);
    if (error instanceof Error) {
      log('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getRecentDocuments = async (userId: number, limit: number = 5): Promise<SearchResult[]> => {
  try {
    const queryText = `
      SELECT 
        id, 
        filename, 
        file_url, 
        file_type, 
        created_at
      FROM documents
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await query(queryText, [userId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error in getRecentDocuments:', error);
    throw new Error('Failed to get recent documents');
  }
};

export const getDocumentById = async (documentId: number, userId: number): Promise<SearchResult | null> => {
  try {
    const queryText = `
      SELECT 
        id, 
        filename, 
        file_url, 
        file_type, 
        created_at
      FROM documents
      WHERE id = $1 AND user_id = $2
    `;

    const result = await query(queryText, [documentId, userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getDocumentById:', error);
    throw new Error('Failed to get document');
  }
};