// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import debug from 'debug';
import { JwtPayload } from 'jsonwebtoken';

const log = debug('app:auth');

interface CustomRequest extends Request {
  user?: JwtPayload & {
    userId: number;
    email: string;
  };
}

export const authenticateToken: RequestHandler = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    log('Auth header:', authHeader);

    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      log('No token provided');
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    log('Token verified successfully:', decoded);

    // Add the decoded user to the request object
    req.user = decoded as JwtPayload & { userId: number; email: string };
    next();
  } catch (error) {
    log('Auth error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ message: 'Invalid token' });
      return;
    }
    res.status(500).json({ message: 'Authentication error' });
    return;
  }
};