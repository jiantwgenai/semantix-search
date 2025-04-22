import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false
    }
});

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        console.log('Initializing database...');

        // Read and execute the initialization SQL
        const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
        
        // Split the SQL into individual statements
        const statements = initSql.split(';').filter(statement => statement.trim());
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement.trim().split('\n')[0], '...');
                await client.query(statement);
            }
        }

        console.log('Database initialization completed successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the initialization
initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Initialization failed:', error);
        process.exit(1);
    }); 