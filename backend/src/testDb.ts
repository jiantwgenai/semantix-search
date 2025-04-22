import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Create connection string
const connectionString = `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Log configuration (without sensitive data)
console.log('Database configuration:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  hasPassword: !!process.env.DB_PASSWORD
});

// Create pool with connection string
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
async function testConnection() {
  console.log('Testing database connection...');
  
  try {
    const client = await pool.connect();
    console.log('Connected to database');
    
    const result = await client.query('SELECT NOW()');
    console.log('Current time:', result.rows[0].now);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
}

// Run test
testConnection().then(success => {
  console.log('Test completed:', success ? 'Success' : 'Failed');
  process.exit(success ? 0 : 1);
}); 