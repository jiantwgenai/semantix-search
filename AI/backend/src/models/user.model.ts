import { pool } from '../config/database';
import debug from 'debug';

const log = debug('app:user-model');

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export const createUser = async (email: string, password_hash: string): Promise<User> => {
  log('Creating new user:', { email });
  const query = `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, password_hash, created_at
  `;
  const values = [email, password_hash];
  try {
    const result = await pool.query(query, values);
    log('User created successfully:', { 
      email, 
      userId: result.rows[0].id,
      hasPasswordHash: !!result.rows[0].password_hash
    });
    return result.rows[0];
  } catch (error) {
    log('Error creating user:', error);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  log('Looking up user by email:', email);
  const query = 'SELECT id, email, password_hash, created_at FROM users WHERE email = $1';
  try {
    const result = await pool.query(query, [email]);
    const user = result.rows[0] || null;
    log('User lookup result:', { 
      email, 
      found: !!user,
      hasPasswordHash: user?.password_hash ? true : false
    });
    return user;
  } catch (error) {
    log('Error finding user:', error);
    throw error;
  }
};