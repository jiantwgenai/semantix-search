// backend/src/routes/document.routes.ts
import express from 'express';
import multer from 'multer';
import { uploadDocument, getDocument, searchDocuments } from '../controllers/document.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

router.post('/upload', authenticateToken, upload.single('file'), uploadDocument);
router.get('/:id', authenticateToken, getDocument);
router.post('/search', authenticateToken, searchDocuments);

export default router;