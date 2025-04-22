# Architecture Diagrams

## 1. System Overview
```mermaid
graph TD
    A[Client] --> B[Frontend React App]
    B --> C[Backend API]
    C --> D[PostgreSQL Database]
    C --> E[AWS S3 Storage]
    C --> F[Llama Embedding Service]
    
    subgraph Frontend
        B --> G[Authentication]
        B --> H[Document Management]
        B --> I[Search Interface]
    end
    
    subgraph Backend
        C --> J[Auth Controller]
        C --> K[Document Controller]
        C --> L[Search Service]
    end
    
    subgraph Database
        D --> M[Users Table]
        D --> N[Documents Table]
        D --> O[Document Chunks Table]
    end
```

## 2. Authentication Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend->>Backend: Generate JWT
    Backend-->>Frontend: JWT token
    Frontend->>Frontend: Store token
    Frontend-->>User: Redirect to dashboard
```

## 3. Document Upload Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant S3
    participant Database
    participant EmbeddingService
    
    User->>Frontend: Select file
    Frontend->>Backend: POST /api/documents/upload
    Backend->>S3: Upload file
    S3-->>Backend: File URL
    Backend->>EmbeddingService: Generate embedding
    EmbeddingService-->>Backend: Vector embedding
    Backend->>Database: Store document metadata
    Backend->>Database: Store document chunks
    Backend-->>Frontend: Success response
    Frontend-->>User: Update document list
```

## 4. Search Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant EmbeddingService
    participant Database
    
    User->>Frontend: Enter search query
    Frontend->>Backend: POST /api/documents/search
    Backend->>EmbeddingService: Generate query embedding
    EmbeddingService-->>Backend: Query vector
    Backend->>Database: Vector similarity search
    Database-->>Backend: Ranked results
    Backend->>Backend: Format results
    Backend-->>Frontend: Search results
    Frontend-->>User: Display results
```

## 5. Database Schema
```mermaid
erDiagram
    users ||--o{ documents : owns
    documents ||--o{ document_chunks : contains
    
    users {
        int id PK
        string email
        string password_hash
        timestamp created_at
    }
    
    documents {
        int id PK
        int user_id FK
        string filename
        string file_type
        string file_url
        timestamp created_at
    }
    
    document_chunks {
        int id PK
        int document_id FK
        string content
        vector embedding
    }
```

## 6. Component Architecture
```mermaid
graph TD
    subgraph Frontend Components
        A[App] --> B[AuthProvider]
        A --> C[DocumentProvider]
        A --> D[SearchProvider]
        
        B --> E[Login]
        B --> F[Register]
        
        C --> G[DocumentList]
        C --> H[DocumentUpload]
        
        D --> I[SearchBar]
        D --> J[SearchResults]
    end
    
    subgraph Backend Services
        K[AuthService] --> L[JWT]
        M[DocumentService] --> N[S3Client]
        M --> O[EmbeddingService]
        P[SearchService] --> Q[VectorDB]
    end
```

## 7. Security Architecture
```mermaid
graph TD
    A[Client] --> B[JWT Auth]
    B --> C[Protected Routes]
    C --> D[API Endpoints]
    D --> E[Database]
    D --> F[S3 Storage]
    
    subgraph Authentication
        B --> G[Token Validation]
        B --> H[Role-based Access]
    end
    
    subgraph Data Protection
        E --> I[Encryption at Rest]
        F --> J[Pre-signed URLs]
    end
```

## 8. Performance Optimization
```mermaid
graph LR
    A[Document Processing] --> B[Chunking]
    B --> C[Parallel Processing]
    C --> D[Vector Indexing]
    
    E[Search Optimization] --> F[Vector Similarity]
    F --> G[Ranking]
    G --> H[Pagination]
    
    I[Storage Optimization] --> J[File Compression]
    J --> K[Efficient Retrieval]
    K --> L[Caching]
```

These diagrams can be rendered using any Mermaid-compatible Markdown viewer. They illustrate:
1. Overall system architecture
2. Authentication flow
3. Document upload process
4. Search process
5. Database schema
6. Component architecture
7. Security measures
8. Performance optimizations 