import AWS from 'aws-sdk';
import { Express } from 'express';
import debug from 'debug';

const log = debug('app:upload');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'  // Explicitly set signature version to v4
});

const s3 = new AWS.S3({
  signatureVersion: 'v4'  // Also set it in the S3 client instance
});

const bucketName = process.env.AWS_BUCKET_NAME;

interface AWSError {
  code: string;
  message: string;
  statusCode?: number;
  requestId?: string;
}

export const uploadFileToS3 = async (file: Express.Multer.File, userId: string): Promise<string> => {
  try {
    // Log AWS configuration (without sensitive data)
    log('AWS Configuration:', {
      region: process.env.AWS_REGION,
      bucketName: bucketName,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    log('Attempting to upload file to S3:', { 
      fileName: file.originalname,
      userId,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    if (!bucketName) {
      throw new Error('AWS_BUCKET_NAME is not configured');
    }

    // Create the S3 key with the original filename
    const key = `${userId}/${Date.now()}-${file.originalname}`;

    log('Generated S3 key:', {
      key,
      userId,
      timestamp: Date.now(),
      originalName: file.originalname
    });

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private'
    };

    log('S3 upload params:', {
      bucket: params.Bucket,
      key: params.Key,
      contentType: params.ContentType,
      acl: params.ACL
    });

    const result = await s3.upload(params).promise();
    
    // Construct the URL manually to ensure consistent format
    const fileUrl = `https://${bucketName}.s3.us-east-2.amazonaws.com/${key}`;
    
    log('File uploaded successfully:', { 
      s3Url: result.Location,
      constructedUrl: fileUrl,
      key: result.Key,
      bucket: result.Bucket
    });
    
    return fileUrl;
  } catch (error) {
    log('Error uploading file to S3:', error);
    
    // Check if it's an AWS error
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const awsError = error as AWSError;
      log('AWS Error details:', {
        code: awsError.code,
        message: awsError.message,
        statusCode: awsError.statusCode,
        requestId: awsError.requestId
      });
      throw new Error(`AWS S3 upload failed: ${awsError.message}`);
    }
    
    // If it's not an AWS error, throw the original error
    throw error;
  }
}; 