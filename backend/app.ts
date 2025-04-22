import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { processDocument, getDocumentChunks, getDocument, searchSimilarChunks } from './services/documentService';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Upload document
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const documentId = await processDocument(req.file);
        res.json({ 
            message: 'File uploaded and processed successfully',
            documentId 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error processing file' });
    }
});

// Get document chunks
app.get('/api/documents/:id/chunks', async (req, res) => {
    try {
        const documentId = parseInt(req.params.id);
        const chunks = await getDocumentChunks(documentId);
        res.json(chunks);
    } catch (error) {
        console.error('Error fetching chunks:', error);
        res.status(500).json({ error: 'Error fetching document chunks' });
    }
});

// Get document metadata
app.get('/api/documents/:id', async (req, res) => {
    try {
        const documentId = parseInt(req.params.id);
        const document = await getDocument(documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(document);
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Error fetching document' });
    }
});

// Semantic search
app.post('/api/search', async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const results = await searchSimilarChunks(query, limit || 5);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Error performing search' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 