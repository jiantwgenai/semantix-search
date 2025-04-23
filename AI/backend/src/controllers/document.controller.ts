// backend/src/controllers/document.controller.ts
import { Request, Response } from 'express';
import { S3 } from 'aws-sdk';
import { createDocument, findDocumentById } from '../models/document.model';
import { generateEmbedding, testEmbeddingService } from '../services/embedding.services';
import { uploadFileToS3 } from '../services/upload.service';
import { searchDocuments as searchService } from '../services/search.service';
import debug from 'debug';
import { JwtPayload } from 'jsonwebtoken';
import { query } from '../config/database';
import AWS from 'aws-sdk';

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

export const uploadDocument = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadResults = await Promise.all(
      req.files.map(async (file) => {
        try {
          // Generate embedding for the file content
          const fileContent = file.buffer.toString('utf-8');
          const embedding = await generateEmbedding(fileContent);

          // Upload file to S3
          const fileUrl = await uploadFileToS3(file, userId.toString());

          // Create document in database
          const documentId = await createDocument({
            user_id: userId,
            filename: file.originalname,
            file_url: fileUrl,
            file_type: file.mimetype,
            embedding,
            content: fileContent
          });

          return {
            success: true,
            id: documentId,
            filename: file.originalname,
            fileUrl,
            fileType: file.mimetype
          };
        } catch (error) {
          log('Error processing file:', file.originalname, error);
          return {
            success: false,
            filename: file.originalname,
            error: 'Failed to process file'
          };
        }
      })
    );

    const successfulUploads = uploadResults.filter(result => result.success);
    const failedUploads = uploadResults.filter(result => !result.success);

    if (successfulUploads.length === 0) {
      return res.status(500).json({
        error: 'All file uploads failed',
        failures: failedUploads
      });
    }

    res.status(201).json({
      successful: successfulUploads,
      failed: failedUploads,
      message: failedUploads.length > 0 ? 'Some files failed to upload' : 'All files uploaded successfully'
    });
  } catch (error) {
    log('Error in file upload:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};

export const getDocument = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const document = await findDocumentById(parseInt(id, 10));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Log the full document details
    log('Document details:', {
      id: document.id,
      filename: document.filename,
      file_url: document.file_url,
      user_id: document.user_id
    });

    // Generate a signed URL for the file
    const s3 = new AWS.S3({
      region: 'us-east-2',
      signatureVersion: 'v4',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Extract the S3 key from the file URL
    // The URL format is: https://ai-search-files.s3.us-east-2.amazonaws.com/userId/timestamp-filename
    const key = document.file_url.split('/').slice(-2).join('/'); // Get userId/filename

    log('S3 key extraction details:', {
      fullUrl: document.file_url,
      extractedKey: key
    });

    try {
      // List objects in the bucket to verify the key exists
      const listResult = await s3.listObjectsV2({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Prefix: `${userId}/`
      }).promise();

      log('Available objects in bucket:', {
        bucket: process.env.AWS_BUCKET_NAME,
        prefix: `${userId}/`,
        objects: listResult.Contents?.map(obj => obj.Key)
      });

      // Verify the object exists before generating the signed URL
      await s3.headObject({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key
      }).promise();

      const signedUrl = await s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Expires: 3600 // URL expires in 1 hour
      });

      res.json({
        ...document,
        signedUrl
      });
    } catch (error) {
      log('Error accessing S3 object:', error);
      // Log the actual S3 key that was attempted
      log('Attempted S3 key:', key);
      res.status(404).json({ error: 'File not found in storage' });
    }
  } catch (error) {
    log('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
};

export const getDocuments = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(
      'SELECT id, filename, file_type, file_url, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Generate pre-signed URLs for each document
    const documents = await Promise.all(result.rows.map(async (doc: Document) => {
      try {
        // Extract the S3 key from the file URL
        const key = doc.file_url.split('/').slice(-2).join('/'); // Get userId/filename

        const signedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Expires: 3600 // URL expires in 1 hour
        });
        return {
          ...doc,
          file_url: signedUrl
        };
      } catch (error) {
        log('Error generating signed URL for document:', doc.id, error);
        return doc; // Return original URL if signing fails
      }
    }));

    res.json(documents);
  } catch (error) {
    log('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const searchDocuments = async (req: CustomRequest, res: Response) => {
  try {
    const { query: searchQuery, mode = 'semantic' } = req.body;
    const userId = req.user?.userId;

    log('Starting search with params:', { searchQuery, mode, userId });

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // First check if there are any documents for this user
    const userDocs = await query(
      'SELECT COUNT(*) FROM documents WHERE user_id = $1',
      [userId]
    );
    log('User document count:', userDocs.rows[0].count);

    const queryEmbedding = await generateEmbedding(searchQuery);
    log('Generated embedding length:', queryEmbedding.length);
    
    const queryVector = `[${queryEmbedding.join(',')}]`;
    log('Query vector format:', queryVector.substring(0, 100) + '...');

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
        WHERE d.user_id = $2
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
          WHEN preview IS NOT NULL THEN 
            json_build_object(
              'type', 
              CASE 
                WHEN file_type LIKE 'text/%' THEN 'text'
                WHEN file_type LIKE 'application/pdf' THEN 'pdf'
                ELSE file_type
              END,
              'data', 
              CASE 
                WHEN file_type LIKE 'text/%' THEN 
                  encode(preview, 'escape')::text
                WHEN file_type LIKE 'application/pdf' THEN
                  'PDF content preview not available'
                ELSE 
                  'Binary content preview not available'
              END
            )
          ELSE NULL 
        END as preview,
        similarity
      FROM ranked_chunks
      WHERE chunk_rank = 1
        AND similarity > 0.1
      ORDER BY similarity DESC
      LIMIT 10
    `;

    // Log the query and embedding details for debugging
    log('Search query details:', {
      searchQuery,
      embeddingLength: queryEmbedding.length,
      queryVectorPreview: queryVector.substring(0, 100) + '...',
      userId
    });

    const result = await query(sqlQuery, [queryVector, userId]);
    log('Search query returned rows:', result.rows.length);

    // Log detailed similarity information for debugging
    result.rows.forEach(row => {
      const preview = typeof row.preview === 'string' ? row.preview.substring(0, 100) + '...' : 'No preview available';
      log('Document similarity details:', {
        id: row.id,
        filename: row.filename,
        similarity: row.similarity,
        preview
      });
    });

    if (result.rows.length === 0) {
      log('No results found. Checking document_chunks table...');
      const chunksCount = await query(
        'SELECT COUNT(*) FROM document_chunks dc JOIN documents d ON dc.document_id = d.id WHERE d.user_id = $1',
        [userId]
      );
      log('Document chunks count:', chunksCount.rows[0].count);
    }

    // Generate pre-signed URLs for each document
    const documents = await Promise.all(result.rows.map(async (doc: Document) => {
      try {
        // Extract the S3 key from the file URL
        const key = doc.file_url.split('/').slice(-2).join('/'); // Get userId/filename

        log('Generating signed URL for document:', {
          id: doc.id,
          file_url: doc.file_url,
          extractedKey: key
        });

        const signedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Expires: 3600 // URL expires in 1 hour
        });
        return {
          ...doc,
          file_url: signedUrl
        };
      } catch (error) {
        log('Error generating signed URL for document:', doc.id, error);
        return doc; // Return original URL if signing fails
      }
    }));

    res.json(documents);
  } catch (error) {
    log('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
};

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