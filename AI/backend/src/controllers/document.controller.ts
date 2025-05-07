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
import { generatePreview } from '../services/preview.service';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import axios from 'axios';

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

// Helper function to check if it's a "click to view" preview
function isClickToViewPreview(preview: any): boolean {
  if (typeof preview === 'object' && preview?.data) {
    return preview.data === 'PDF content preview available - click to view' ||
           preview.data === 'Word document preview available - click to view';
  }
  return false;
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
          // Extract text based on file type
          let extractedText = '';
          
          if (file.mimetype === 'application/pdf') {
            try {
              const pdfData = await pdf(file.buffer);
              extractedText = pdfData.text;
              console.log('Extracted PDF text:', extractedText.substring(0, 100) + '...');
            } catch (err) {
              console.error('Error extracting PDF text:', err);
            }
          } else if (file.mimetype === 'application/msword' || 
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
              const result = await mammoth.extractRawText({ buffer: file.buffer });
              extractedText = result.value;
              console.log('Extracted Word text:', extractedText.substring(0, 100) + '...');
            } catch (err) {
              console.error('Error extracting Word text:', err);
            }
          } else if (file.mimetype.startsWith('text/')) {
            extractedText = file.buffer.toString('utf-8');
          }
          
          // Use extracted text for embeddings if available
          const contentForEmbedding = extractedText || file.buffer.toString('utf-8');
          const embedding = await generateEmbedding(contentForEmbedding);

          // Upload to S3
          const fileUrl = await uploadFileToS3(file, userId.toString());

          // Create document
          const documentId = await createDocument({
            user_id: userId,
            filename: file.originalname,
            file_url: fileUrl,
            file_type: file.mimetype,
            embedding,
            content: contentForEmbedding,
            extracted_text: extractedText // Pass to document model
          });

          // Create document chunks with the extracted text
          const chunkSize = 1000;
          const chunks = [];
          
          // Use extracted text for chunks
          const textToChunk = extractedText || file.originalname;
          
          for (let i = 0; i < textToChunk.length; i += chunkSize) {
            chunks.push(textToChunk.slice(i, i + chunkSize));
          }
          
          // Insert chunks
          await Promise.all(chunks.map(async (chunk, index) => {
            const chunkEmbedding = await generateEmbedding(chunk);
            const chunkBuffer = Buffer.from(chunk, 'utf8');
            
            await query(
              `INSERT INTO document_chunks (document_id, chunk_number, content, embedding)
               VALUES ($1, $2, $3, $4)`,
              [documentId, index + 1, chunkBuffer, `[${chunkEmbedding.join(',')}]`]
            );
          }));

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

    // Add this before the response is sent
    log('Response data:', JSON.stringify(documents[0]?.preview));
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

    // First check if there are any documents
    const userDocs = await query(
      'SELECT COUNT(*) FROM documents'
    );
    log('Total document count:', userDocs.rows[0].count);

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
        (
        CASE 
          WHEN preview IS NOT NULL THEN 
            json_build_object(
              'type', 
              CASE 
                WHEN file_type LIKE 'text/%' THEN 'text'
                WHEN file_type LIKE 'application/pdf' THEN 'pdf'
                  WHEN file_type LIKE 'application/msword' OR 
                       file_type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN 'word'
                ELSE file_type
              END,
              'data', 
              CASE 
                WHEN file_type LIKE 'text/%' THEN 
                    COALESCE(NULLIF(substring(convert_from(preview, 'UTF8') from 1 for 500), ''), 'No preview available')
                WHEN file_type LIKE 'application/pdf' THEN
                    'PDF content preview available - click to view'
                  WHEN file_type LIKE 'application/msword' OR 
                       file_type LIKE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN
                    'Word document preview available - click to view'
                  ELSE 'Binary content preview not available'
              END
            )
            ELSE
              json_build_object(
                'type', file_type,
                'data', 'Preview not available'
              )
          END
        ) as preview,
        similarity
      FROM ranked_chunks
      WHERE chunk_rank = 1
        AND similarity > 0.25
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

    const result = await query(sqlQuery, [queryVector]);
    log('Search query returned rows:', result.rows.length);

    // Log detailed similarity information for debugging
    result.rows.forEach(row => {
      const preview = row.preview?.data 
        ? (typeof row.preview.data === 'string' ? row.preview.data.substring(0, 100) + '...' : row.preview.data)
        : 'No preview available';
      
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
        // Get signed URL
        const key = doc.file_url.split('/').slice(-2).join('/');
        const signedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Expires: 3600
        });
        
        // Check if it's a PDF and needs content extraction
        if (doc.file_type === 'application/pdf' && isClickToViewPreview(doc.preview)) {
          const pdfContent = await fetchAndExtractPdfContent(signedUrl);
          return {
            ...doc,
            file_url: signedUrl,
            preview: {
              type: 'pdf',
              data: pdfContent.substring(0, 500) // First 500 chars
            }
          };
        }
        
        return {
          ...doc,
          file_url: signedUrl
        };
      } catch (error) {
        // Handle errors
        return doc;
      }
    }));

    // Add this before the response is sent
    log('Response data:', JSON.stringify(documents[0]?.preview));
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

export const getDocumentPreview = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const document = await findDocumentById(parseInt(id));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const preview = await generatePreview(document);
    res.json({ preview });
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ 
      preview: {
        type: 'error',
        data: 'Failed to generate preview'
      }
    });
  }
};

// Add this function to extract PDF content on-demand
const fetchAndExtractPdfContent = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const pdfData = await pdf(buffer);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    return 'Could not extract PDF content';
  }
};