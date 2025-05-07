import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import AWS from 'aws-sdk';
import { Document } from '../types';

const s3 = new AWS.S3();

interface PreviewResponse {
  type: string;
  data: string;
}

export const generatePreview = async (document: Document): Promise<PreviewResponse> => {
  // Extract the correct S3 key from the file URL
  // The URL format is: userId/timestamp-filename
  const key = document.file_url.split('/').slice(-2).join('/').split('?')[0];

  const s3Params = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key
  };

  try {
    const file = await s3.getObject(s3Params).promise();
    const buffer = file.Body as Buffer;

    switch (document.file_type) {
      case 'application/pdf':
        try {
          const pdfData = await pdf(buffer);
          return {
            type: 'pdf',
            data: pdfData.text
          };
        } catch (pdfError) {
          console.error('Error extracting PDF content:', pdfError);
          return {
            type: 'pdf',
            data: 'PDF content preview not available'
          };
        }

      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        try {
          const result = await mammoth.extractRawText({ buffer });
          if (!result.value) {
            return {
              type: 'word',
              data: 'No text content found in Word document'
            };
          }
          return {
            type: 'word',
            data: result.value
          };
        } catch (wordError) {
          console.error('Error extracting Word document content:', wordError);
          return {
            type: 'word',
            data: 'Word document content preview not available'
          };
        }

      case 'text/plain':
        return {
          type: 'text',
          data: buffer.toString('utf-8')
        };

      default:
        return {
          type: document.file_type,
          data: `Preview not available for file type: ${document.file_type}`
        };
    }
  } catch (error) {
    console.error('Preview generation error:', error);
    return {
      type: document.file_type,
      data: 'Error generating preview'
    };
  }
}; 