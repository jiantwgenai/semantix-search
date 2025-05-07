// backend/src/routes/document.routes.ts
import express, { RequestHandler } from 'express';
import multer from 'multer';
import { uploadDocument, getDocument, searchDocuments, getDocuments, deleteDocument, getDocumentPreview } from '../controllers/document.controller';
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

// Cast all handlers to RequestHandler type
router.get('/', authenticateToken as RequestHandler, getDocuments as RequestHandler);
router.post('/upload', 
  authenticateToken as RequestHandler, 
  upload.array('files', 10), 
  uploadDocument as RequestHandler
);
router.get('/:id', authenticateToken as RequestHandler, getDocument as RequestHandler);
router.post('/search', authenticateToken as RequestHandler, searchDocuments as RequestHandler);
router.delete('/:id', authenticateToken as RequestHandler, deleteDocument as RequestHandler);
router.get('/:id/preview', authenticateToken as RequestHandler, getDocumentPreview as RequestHandler);

export default router;