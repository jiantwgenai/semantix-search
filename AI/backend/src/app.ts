// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import debug from 'debug';
import path from 'path';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import { initializeDatabase } from './config/database';
import { initializeSchema } from './config/schema';
import { testEmbeddingService } from './services/embedding.services';
import { pool } from './config/database';
import AWS from 'aws-sdk';

const log = debug('app:server');

// Load environment variables from src/.env
const envPath = path.resolve(__dirname, '.env');
log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('Environment loaded. PORT:', process.env.PORT);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://3.128.30.11:3001',
    'http://3.128.30.11'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Debug logging middleware
app.use((req, res, next) => {
  log(`${req.method} ${req.url}`);
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Test endpoint
app.get('/api/test', async (req, res) => {
  log('Test endpoint called');
  const results = {
    server: 'ok',
    database: false,
    embedding: false,
    s3: false,
    errors: {} as Record<string, any>,
    config: {
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        name: process.env.DB_NAME,
        hasUser: !!process.env.DB_USER,
        hasPassword: !!process.env.DB_PASSWORD
      },
      aws: {
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_BUCKET_NAME,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      },
      embedding: {
        url: process.env.EMBEDDING_API_URL
      }
    }
  };

  try {
    log('Testing database connection...');
    await pool.query('SELECT NOW()');
    results.database = true;
    log('Database connection successful');
  } catch (error) {
    const err = error as Error;
    log('Database test failed:', err);
    results.errors.database = err.message;
  }

  try {
    log('Testing embedding service connection...');
    results.embedding = await testEmbeddingService();
    log('Embedding service test result:', results.embedding);
  } catch (error) {
    const err = error as Error;
    log('Embedding service test failed:', err);
    results.errors.embedding = err.message;
  }

  try {
    log('Testing S3 connection...');
    const s3 = new AWS.S3();
    await s3.headBucket({ Bucket: process.env.AWS_BUCKET_NAME || '' }).promise();
    results.s3 = true;
    log('S3 connection successful');
  } catch (error) {
    const err = error as Error;
    log('S3 test failed:', err);
    results.errors.s3 = err.message;
  }

  log('Test results:', results);
  res.json(results);
});

// Initialize database and schema before starting the server
const initializeServer = async () => {
  try {
    log('Starting server initialization...');
    
    // Initialize database connection
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      throw new Error('Failed to initialize database connection');
    }
    
    // Initialize database schema
    const schemaInitialized = await initializeSchema();
    if (!schemaInitialized) {
      throw new Error('Failed to initialize database schema');
    }
    
    // Start the server
    app.listen(port, () => {
      log(`Server is running on port ${port}`);
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error during server initialization:', error);
    process.exit(1);
  }
};

initializeServer();

export default app;