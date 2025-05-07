// backend/src/controllers/search.controller.ts
import { Request, Response, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types/custom';
import { searchDocuments } from '../services/search.service';

export const search = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check if user exists first
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { query } = req.body;
    const userId = req.user.userId;

    if (!query) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    await searchDocuments(req, res);
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
};

export const getRecentDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check if user exists first
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const userId = req.user.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    await searchDocuments(req, res);
  } catch (error) {
    console.error('Error in getRecentDocuments:', error);
    res.status(500).json({ message: 'Error retrieving recent documents' });
  }
};