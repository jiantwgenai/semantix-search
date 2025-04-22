import { S3 } from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async function testS3() {
  try {
    console.log('Testing S3 connectivity...');
    console.log('Bucket:', process.env.AWS_BUCKET_NAME);
    
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      MaxKeys: 1
    };

    const result = await s3.listObjectsV2(params).promise();
    console.log('S3 connection successful!');
    console.log('Bucket contents:', result.Contents?.length || 0, 'objects');
    
    process.exit(0);
  } catch (error) {
    console.error('S3 connection failed:', error);
    process.exit(1);
  }
}

testS3(); 