
import React from 'react';
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download, FileText, Calendar, FileIcon } from "lucide-react";
import { format } from "date-fns";

interface DocumentPreviewProps {
  document: Document | null;
  onClose: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose }) => {
  if (!document) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return dateString;
    }
  };

  const getIconForFileType = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-12 w-12 text-red-500" />;
      case 'docx':
        return <FileText className="h-12 w-12 text-blue-500" />;
      case 'pptx':
        return <FileText className="h-12 w-12 text-orange-500" />;
      case 'xlsx':
        return <FileText className="h-12 w-12 text-green-500" />;
      case 'txt':
        return <FileText className="h-12 w-12 text-gray-500" />;
      default:
        return <FileIcon className="h-12 w-12 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold truncate">
            {document.name}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-6">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="rounded bg-muted p-4 mb-4">
              {getIconForFileType(document.type)}
            </div>
            <h3 className="text-xl font-medium mb-1">{document.name}</h3>
            <p className="text-sm text-muted-foreground">
              {formatSize(document.size)} • {document.type.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Uploaded on {formatDate(document.uploadDate)}
            </p>
          </div>
          
          <div className="bg-muted rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Preview not available. Download the document to view its contents.
            </p>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentPreview;
