# Semantix Document Search

A semantic document search application that allows users to upload, search, and manage documents with AI-powered semantic search capabilities.

## Features

- Document upload and storage
- Semantic search using embeddings
- Document preview
- User authentication
- File management

## Project Structure

```
semantix-document-search/
├── backend/               # Backend API server
│   ├── src/              # Source code
│   ├── package.json      # Backend dependencies
│   └── tsconfig.json     # TypeScript configuration
├── frontend/             # React frontend
│   ├── src/              # Source code
│   ├── package.json      # Frontend dependencies
│   └── tsconfig.json     # TypeScript configuration
└── README.md             # Project documentation
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- AWS S3 bucket
- Python 3.8+ (for embedding service)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/semantix-document-search.git
   cd semantix-document-search
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Configure your environment variables
   npm run dev
   ```

## Environment Variables

### Backend (.env)
```
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
JWT_SECRET=your_jwt_secret
EMBEDDING_API_URL=http://localhost:5000
PORT=3001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

## Development

- Backend: `npm run dev` (runs on port 3001)
- Frontend: `npm run dev` (runs on port 5174)

## License

MIT 