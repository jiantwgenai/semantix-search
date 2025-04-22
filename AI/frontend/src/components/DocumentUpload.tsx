// semantix-document-search/src/components/DocumentUpload.tsx
import React, { useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileType, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocuments } from '@/lib/api';

interface FileWithPreview extends File {
  preview?: string;
}

const DocumentUpload: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Add these drag and drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files) as FileWithPreview[];
      
      // Add preview for images
      newFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          file.preview = URL.createObjectURL(file);
        }
      });
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as FileWithPreview[];
      
      // Add preview for images
      newFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          file.preview = URL.createObjectURL(file);
        }
      });
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting upload process with files:', files.map(f => ({ name: f.name, size: f.size })));
    setIsUploading(true);
    
    try {
      console.log('Calling uploadDocuments API...');
      await uploadDocuments(files);
      console.log('Upload completed successfully');
      
      toast({
        title: "Upload successful",
        description: `${files.length} file(s) uploaded successfully`,
        variant: "default"
      });
      
      // Cleanup previews
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      setFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred while uploading your files",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Upload Documents</h2>
      <p className="text-muted-foreground">
        Upload documents to enable semantic search powered by LLaMA embeddings.
      </p>
      
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/50"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          onChange={onFileChange}
          accept=".pdf,.docx,.txt,.md,.pptx,.xlsx"
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              Drag and drop files here or click to upload
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PDF, DOCX, TXT, MD, PPTX, XLSX
            </p>
          </div>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Selected Files ({files.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div className="rounded bg-muted p-2 mr-4">
                      <FileType className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={uploadFiles}
              disabled={isUploading}
              className="mt-4"
            >
              {isUploading ? "Uploading..." : "Upload All Files"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;