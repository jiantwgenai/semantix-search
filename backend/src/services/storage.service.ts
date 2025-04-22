import { S3 } from 'aws-sdk';
import { createReadStream } from 'fs';
import { basename } from 'path';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export class StorageService {
  private s3: S3;
  private bucket: string;

  constructor() {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
    this.bucket = process.env.AWS_BUCKET_NAME || '';
  }

  async uploadFile(file: UploadedFile, userId: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}-${file.originalname}`;

    const params: S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        userId,
        originalName: file.originalname,
        uploadTime: new Date().toISOString()
      }
    };

    try {
      const result = await this.s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  async getFile(key: string): Promise<S3.GetObjectOutput> {
    const params: S3.GetObjectRequest = {
      Bucket: this.bucket,
      Key: key
    };

    try {
      return await this.s3.getObject(params).promise();
    } catch (error) {
      console.error('Error getting file from S3:', error);
      throw new Error('Failed to retrieve file from storage');
    }
  }

  async deleteFile(key: string): Promise<void> {
    const params: S3.DeleteObjectRequest = {
      Bucket: this.bucket,
      Key: key
    };

    try {
      await this.s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  getSignedUrl(key: string, expiresIn: number = 3600): string {
    const params: S3.GetObjectRequest = {
      Bucket: this.bucket,
      Key: key
    };

    return this.s3.getSignedUrl('getObject', {
      ...params,
      Expires: expiresIn
    });
  }
}

export const storageService = new StorageService();