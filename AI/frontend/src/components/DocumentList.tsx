
import React, { useState } from 'react';
import { MOCK_DOCUMENTS, Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, FileType, Download, Trash2, Calendar, FileIcon } from "lucide-react";
import { format } from "date-fns";

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ onDocumentSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [activeTab, setActiveTab] = useState("all");

  const filteredDocuments = documents.filter(doc => {
    if (searchTerm === "") return true;
    return doc.name.toLowerCase().includes(searchTerm.toLowerCase());
  }).filter(doc => {
    if (activeTab === "all") return true;
    return doc.type === activeTab;
  });

  const deleteDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getIconForFileType = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-10 w-10 text-red-500" />;
      case 'docx':
        return <FileText className="h-10 w-10 text-blue-500" />;
      case 'pptx':
        return <FileText className="h-10 w-10 text-orange-500" />;
      case 'xlsx':
        return <FileText className="h-10 w-10 text-green-500" />;
      case 'txt':
        return <FileText className="h-10 w-10 text-gray-500" />;
      default:
        return <FileIcon className="h-10 w-10 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Documents</h2>
      
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
          <TabsTrigger value="docx">Word</TabsTrigger>
          <TabsTrigger value="pptx">PowerPoint</TabsTrigger>
          <TabsTrigger value="txt">Text</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileType className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm 
                  ? "Try a different search term or upload new documents."
                  : "Upload some documents to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDocuments.map((doc) => (
                <Card 
                  key={doc.id}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onDocumentSelect(doc)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center p-4">
                      <div className="rounded bg-muted p-2 mr-4">
                        {getIconForFileType(doc.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{formatDate(doc.uploadDate)}</span>
                          <span className="mx-2">•</span>
                          <span>{formatSize(doc.size)}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Download logic
                          }}
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Download"
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentList;
