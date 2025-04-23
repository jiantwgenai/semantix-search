import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT name FROM migrations'
    );
    const executedMigrationNames = executedMigrations.map(row => row.name);

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        await pool.query('BEGIN');
        try {
          await pool.query(sql);
          await pool.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await pool.query('COMMIT');
          console.log(`Migration ${file} completed successfully`);
        } catch (error) {
          await pool.query('ROLLBACK');
          console.error(`Error executing migration ${file}:`, error);
          throw error;
        }
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate(); 