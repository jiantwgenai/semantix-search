-- Create document_status enum type
CREATE TYPE document_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- Add status column to documents table
ALTER TABLE documents ADD COLUMN status document_status NOT NULL DEFAULT 'PROCESSING'; 