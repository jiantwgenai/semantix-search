// backend/src/config/database.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
import debug from 'debug';
import path from 'path';

const log = debug('app:database');

// Load environment variables from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '..', '..', '.env'),  // backend/.env
  path.resolve(__dirname, '..', '.env'),        // backend/src/.env
  path.resolve(process.cwd(), '.env')           // current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    log('Attempting to load .env from:', envPath);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      log('Successfully loaded .env from:', envPath);
      log('Loaded environment variables:', {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        hasPassword: !!process.env.DB_PASSWORD
      });
      break;
    }
  } catch (error) {
    log('Failed to load .env from:', envPath, error);
  }
}

if (!envLoaded) {
  log('Warning: No .env file loaded successfully');
  throw new Error('Failed to load environment variables');
}

// Verify all required environment variables are present
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  log('Missing required environment variables:', missingVars);
  log('Current environment:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    hasPassword: !!process.env.DB_PASSWORD
  });
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Create the pool with explicit configuration
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  // Additional options to ensure proper connection
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Log configuration (without sensitive data)
log('Database configuration:', {
  host: pool.options.host,
  port: pool.options.port,
  database: pool.options.database,
  user: pool.options.user,
  hasPassword: !!pool.options.password
});

// Test the connection
pool.on('connect', () => {
  log('Database connection established');
});

pool.on('error', (err) => {
  log('Database connection error:', err);
  console.error('Database error:', err);
});

export const initializeDatabase = async (): Promise<boolean> => {
  const client = await pool.connect();
  try {
    log('Initializing database...');
    
    // Test basic connection
    const result = await client.query('SELECT NOW()');
    log('Basic connection test successful:', result.rows[0]);
    
    // Check if vector extension exists
    try {
      const vectorCheck = await client.query('SELECT * FROM pg_extension WHERE extname = $1', ['vector']);
      if (vectorCheck.rows.length === 0) {
        log('Vector extension not found, attempting to install...');
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        log('Vector extension installed successfully');
      } else {
        log('Vector extension already installed');
      }
    } catch (error) {
      log('Error checking/installing vector extension:', error);
      throw error;
    }
    
    // Check if tables exist
    const tables = ['users', 'documents', 'document_chunks'];
    for (const table of tables) {
      const tableCheck = await client.query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        [table]
      );
      log(`Table ${table} exists:`, tableCheck.rows[0].exists);
    }
    
    client.release();
    return true;
  } catch (error) {
    log('Database initialization failed:', error);
    console.error('Database initialization error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    client.release();
    return false;
  }
};

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    log('Executed query:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    log('Query error:', { text, error });
    throw error;
  }
};