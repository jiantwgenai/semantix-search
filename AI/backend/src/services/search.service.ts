import { query } from '../config/database';
import { generateEmbedding } from './embedding.services';
import debug from 'debug';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/custom';

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
  preview?: {
    type: string;
    data: string;
  };
}

// Search configuration
const SEARCH_CONFIG = {
  maxResults: 20,
  similarityThreshold: 0.1,
  previewLength: 200
};

export const searchDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query: searchQuery, mode = 'semantic' } = req.body;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(searchQuery);
    
    // Log the embedding details
    log('Generated embedding:', {
      length: queryEmbedding.length,
      preview: queryEmbedding.slice(0, 5),
      queryText: searchQuery
    });
    
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
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
      WHERE embedding IS NOT NULL
    `);

    log('Available documents with embeddings:', {
      count: docCheck.rows.length,
      documents: docCheck.rows.map(d => ({ id: d.id, filename: d.filename, dim: d.dim }))
    });

    // Search in both documents and document_chunks using vector similarity
    const sqlQuery = `
      WITH chunk_similarity AS (
        SELECT 
          d.id,
          d.filename,
          d.file_type,
          d.file_url,
          d.created_at,
          dc.content as preview,
          1 - (dc.embedding <=> $1) as similarity
        FROM documents d
        JOIN document_chunks dc ON d.id = dc.document_id
        WHERE 1=1
      ),
      ranked_chunks AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (PARTITION BY id ORDER BY similarity DESC) as chunk_rank
        FROM chunk_similarity
      )
      SELECT 
        id,
        filename,
        file_type,
        file_url,
        created_at,
        CASE 
          WHEN file_type LIKE 'text/%' AND preview IS NOT NULL THEN 
            json_build_object(
              'type', 'text',
              'data', substring(convert_from(preview, 'UTF8') from 1 for 200)
            )
          WHEN file_type LIKE 'application/pdf' THEN 
            json_build_object(
              'type', 'pdf',
              'data', 'PDF content preview not available'
            )
          WHEN file_type LIKE 'application/msword' OR file_type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN
            json_build_object(
              'type', 'word',
              'data', 'Binary content preview not available'
            )
          ELSE 
            json_build_object(
              'type', file_type,
              'data', 'Preview not available'
            )
        END as preview,
        similarity
      FROM ranked_chunks
      WHERE chunk_rank = 1
        AND similarity > 0.25
      ORDER BY similarity DESC
      LIMIT 10
    `;

    log('Executing search query with params:', {
      similarityThreshold: SEARCH_CONFIG.similarityThreshold,
      maxResults: SEARCH_CONFIG.maxResults,
      queryText: searchQuery
    });

    const result = await query(sqlQuery, [queryVector]);
    
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

    res.json({ results: result.rows });
  } catch (error) {
    log('Error in searchDocuments:', error);
    if (error instanceof Error) {
      log('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getRecentDocuments = async (limit: number = 5): Promise<SearchResult[]> => {
  try {
    const queryText = `
      SELECT 
        id, 
        filename, 
        file_url, 
        file_type, 
        created_at,
        1 as similarity,
        json_build_object(
          'type', file_type,
          'data',
          CASE 
            WHEN file_type LIKE 'application/pdf' THEN 'PDF content preview not available'
            WHEN file_type LIKE 'application/msword' OR 
                 file_type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            THEN 'Binary content preview not available'
            ELSE 'Preview not available'
          END
        ) as preview
      FROM documents
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await query(queryText, [limit]);
    return result.rows;
  } catch (error) {
    throw new Error(`Failed to get recent documents: ${error}`);
  }
};

export const getDocumentById = async (documentId: number): Promise<SearchResult | null> => {
  try {
    const queryText = `
      SELECT 
        id, 
        filename, 
        file_url, 
        file_type, 
        created_at
      FROM documents
      WHERE id = $1
    `;

    const result = await query(queryText, [documentId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in getDocumentById:', error);
    throw new Error('Failed to get document');
  }
};