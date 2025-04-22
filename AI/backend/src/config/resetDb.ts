import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS document_chunks;
      DROP TABLE IF EXISTS documents;
      DROP TABLE IF EXISTS users;
    `);
    console.log('Tables dropped successfully');

    console.log('Reading initialization SQL...');
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    console.log('Executing initialization SQL...');
    await client.query(initSql);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase()
  .then(() => {
    console.log('Database reset completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  }); 