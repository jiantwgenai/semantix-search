import { pool } from './database';
import debug from 'debug';

const log = debug('app:schema');

export const initializeSchema = async (): Promise<boolean> => {
  const client = await pool.connect();
  try {
    log('Initializing database schema...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Install vector extension
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector
    `);

    // Create documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        filename VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        embedding vector(4096),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create document_chunks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL REFERENCES documents(id),
        chunk_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding vector(4096),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for vector similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
      ON document_chunks 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    log('Database schema initialized successfully');
    return true;
  } catch (error) {
    log('Schema initialization failed:', error);
    console.error('Schema initialization error:', error);
    return false;
  } finally {
    client.release();
  }
}; 