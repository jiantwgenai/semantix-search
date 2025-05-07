import { Request, Response, RequestHandler } from 'express';
import { createUser, findUserByEmail } from '../models/user.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import debug from 'debug';

const log = debug('app:auth-controller');

export const register: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    log('Registering new user:', { email });

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      log('Registration failed: User already exists', { email });
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    log('Password hashed successfully');

    // Create user
    const user = await createUser(email, password_hash);
    log('User created successfully:', { userId: user.id });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    log('Sending success response for user:', { userId: user.id });
    res.status(201).json({ token });
  } catch (error) {
    log('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    log('Login attempt:', { email });

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      log('Login failed: User not found', { email });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    log('Verifying password:', { 
      email,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length
    });
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      log('Login failed: Invalid password', { email });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    log('Login successful:', { email, userId: user.id });
    res.json({ token });
  } catch (error) {
    log('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};