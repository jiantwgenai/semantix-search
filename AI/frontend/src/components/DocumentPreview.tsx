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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return dateString;
    }
  };

  const getIconForFileType = (type: string) => {
    if (type.includes('pdf')) {
      return <FileText className="h-12 w-12 text-red-500" />;
    } else if (type.includes('word') || type.includes('docx')) {
      return <FileText className="h-12 w-12 text-blue-500" />;
    } else if (type.includes('powerpoint') || type.includes('pptx')) {
      return <FileText className="h-12 w-12 text-orange-500" />;
    } else if (type.includes('excel') || type.includes('xlsx')) {
      return <FileText className="h-12 w-12 text-green-500" />;
    } else if (type.includes('text')) {
      return <FileText className="h-12 w-12 text-gray-500" />;
    }
    return <FileIcon className="h-12 w-12 text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold truncate">
            {document.filename}
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
              {getIconForFileType(document.file_type)}
            </div>
            <h3 className="text-xl font-medium mb-1">{document.filename}</h3>
            <p className="text-sm text-muted-foreground">
              {document.file_type}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Uploaded on {formatDate(document.created_at)}
            </p>
          </div>
          
          <div className="bg-muted rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Preview not available. Download the document to view its contents.
            </p>
            <Button
              onClick={() => window.open(document.file_url, '_blank')}
            >
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
