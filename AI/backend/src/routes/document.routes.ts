// backend/src/routes/document.routes.ts
import express from 'express';
import multer from 'multer';
import { uploadDocument, getDocument, searchDocuments, getDocuments, deleteDocument } from '../controllers/document.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Allow up to 10 files
  }
});

router.get('/', authenticateToken, getDocuments);
router.post('/upload', authenticateToken, upload.array('files', 10), uploadDocument);
router.get('/:id', authenticateToken, getDocument);
router.post('/search', authenticateToken, searchDocuments);
router.delete('/:id', authenticateToken, deleteDocument);

export default router;