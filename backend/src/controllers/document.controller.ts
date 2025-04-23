import { Request, Response } from 'express';
import { S3 } from 'aws-sdk';
import { JwtPayload } from 'jsonwebtoken';
import { query } from '../config/database';
import debug from 'debug';

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const log = debug('app:documentController');

interface CustomRequest extends Request {
  user?: JwtPayload & {
    userId: number;
    email: string;
  };
}

interface Document {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  file_url: string;
  created_at: string;
  preview?: string;
  similarity?: number;
}

const searchQuery = `
  WITH chunk_similarity AS (
    SELECT 
      dc.*,
      d.*,
      1 - (dc.embedding <=> $1::vector) as similarity,
      ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY 1 - (dc.embedding <=> $1::vector) DESC) as chunk_rank,
      CASE 
        WHEN d.file_type = 'text/plain' THEN json_build_object(
          'type', 'text',
          'data', convert_from(dc.content, 'UTF8')
        )::text
        ELSE json_build_object(
          'type', d.file_type,
          'data', 'Binary content - preview not available'
        )::text
      END as preview_content
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.status = 'COMPLETED'
  )
  SELECT 
    json_build_object(
      'id', d.id,
      'user_id', d.user_id,
      'filename', d.filename,
      'file_url', d.file_url,
      'file_type', d.file_type,
      'status', d.status,
      'created_at', d.created_at,
      'updated_at', d.updated_at
    ) as document,
    json_build_object(
      'id', cs.id,
      'document_id', cs.document_id,
      'content', cs.preview_content,
      'embedding', cs.embedding,
      'created_at', cs.created_at
    ) as chunk,
    cs.similarity
  FROM chunk_similarity cs
  WHERE cs.chunk_rank = 1 AND cs.similarity > 0.5
  ORDER BY cs.similarity DESC
  LIMIT 10;
`; 

export const deleteDocument = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // First, get the document details from the database
    const result = await query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [parseInt(id), userId]
    );
    
    const document = result.rows[0];
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Extract the S3 key from the file URL
    const key = document.file_url.split('/').slice(-2).join('/');

    // Delete file from S3
    try {
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key
      }).promise();
    } catch (error) {
      log('Error deleting file from S3:', error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete document chunks first (due to foreign key constraint)
    await query(
      'DELETE FROM document_chunks WHERE document_id = $1',
      [parseInt(id)]
    );

    // Delete the document
    await query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2',
      [parseInt(id), userId]
    );

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    log('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}; 