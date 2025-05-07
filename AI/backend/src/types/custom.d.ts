import { JwtPayload } from 'jsonwebtoken';
import { Request, Response } from 'express';

declare module 'express' {
    interface Request {
        user?: JwtPayload & {
            userId: number;
            email: string;
        }
    }
}

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: number;
        email: string;
    };
}