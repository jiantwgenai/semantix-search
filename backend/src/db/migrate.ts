import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

async function runMigrations() {
    const pool = new Pool(config.db);

    try {
        // Create migrations table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Get all migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // Get executed migrations
        const { rows: executedMigrations } = await pool.query(
            'SELECT name FROM migrations'
        );
        const executedFiles = new Set(executedMigrations.map(row => row.name));

        // Run pending migrations
        for (const file of files) {
            if (!executedFiles.has(file)) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(
                    path.join(migrationsDir, file),
                    'utf8'
                );

                await pool.query('BEGIN');
                try {
                    await pool.query(sql);
                    await pool.query(
                        'INSERT INTO migrations (name) VALUES ($1)',
                        [file]
                    );
                    await pool.query('COMMIT');
                    console.log(`Successfully executed: ${file}`);
                } catch (error) {
                    await pool.query('ROLLBACK');
                    console.error(`Error executing ${file}:`, error);
                    throw error;
                }
            }
        }

        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

export { runMigrations }; 