import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { search } from '../controllers/search.controller';

const router = Router();

router.post('/', authenticateToken, search);

export const searchRoutes = router;