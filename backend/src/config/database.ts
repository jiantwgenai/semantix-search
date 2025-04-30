import { Pool } from 'pg';
import dotenv from 'dotenv';
import debug from 'debug';
import path from 'path';
import { RDSClient } from '@aws-sdk/client-rds';
import { Signer } from '@aws-sdk/rds-signer';

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
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'AWS_REGION'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Initialize AWS RDS client
const rdsClient = new RDSClient({ region: process.env.AWS_REGION });

// Create signer for IAM authentication
const signer = new Signer({
  region: process.env.AWS_REGION,
  hostname: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
});

// Function to get authentication token
async function getAuthToken() {
  try {
    return await signer.getAuthToken();
  } catch (error) {
    log('Error getting auth token:', error);
    throw error;
  }
}

// Create the pool with AWS authentication
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: async () => await getAuthToken(), // Dynamic password using IAM authentication
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  // Add connection error handler
  async onError(err, client) {
    log('Database connection error:', err);
    // Implement retry logic if needed
  }
});

// Test the connection
pool.on('connect', () => {
  log('Connected to database successfully');
});

pool.on('error', (err) => {
  log('Unexpected error on idle client', err);
}); 