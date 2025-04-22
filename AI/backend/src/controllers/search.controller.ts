// backend/src/controllers/search.controller.ts
import { Request, Response } from 'express';
import { searchDocuments } from '../services/search.service';

export const search = async (req: Request, res: Response) => {
  try {
    // Check if user exists first
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { query } = req.body;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const results = await searchDocuments(query, userId); // Added default limit of 10

    res.json({
      results
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
};

export const getRecentDocuments = async (req: Request, res: Response) => {
  try {
    // Check if user exists first
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    const results = await searchDocuments('', userId);

    res.json({
      results
    });
  } catch (error) {
    console.error('Error in getRecentDocuments:', error);
    res.status(500).json({ message: 'Error retrieving recent documents' });
  }
};