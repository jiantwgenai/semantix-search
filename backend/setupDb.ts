import { pool } from './src/config/database';
import fs from 'fs';
import path from 'path';
import debug from 'debug';

const log = debug('app:setup-db');

async function setupDatabase() {
    try {
        log('Starting database schema setup...');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Drop existing tables if they exist
        log('Dropping existing tables...');
        await pool.query(`
            DROP TABLE IF EXISTS document_chunks;
            DROP TABLE IF EXISTS documents;
        `);
        log('Existing tables dropped');

        // Execute the schema
        log('Creating new tables...');
        await pool.query(schema);
        log('Database schema setup completed successfully');

        return true;
    } catch (error) {
        log('Error setting up database schema:', error);
        return false;
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    setupDatabase()
        .then(success => {
            if (success) {
                console.log('Database setup completed successfully');
                process.exit(0);
            } else {
                console.error('Database setup failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Error during database setup:', error);
            process.exit(1);
        });
} 