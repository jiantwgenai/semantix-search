import React, { useState, useEffect } from 'react';
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Search, FileType, Download, Trash2, Calendar, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ onDocumentSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');
      console.log('Fetched documents:', response.data);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const matchesTab = (doc: Document, tab: string) => {
    if (tab === "all") return true;
    const type = doc.file_type.toLowerCase();
    switch (tab) {
      case "pdf":
        return type === "application/pdf";
      case "docx":
        return (
          type === "application/msword" ||
          type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      case "pptx":
        return (
          type === "application/vnd.ms-powerpoint" ||
          type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        );
      case "txt":
        return (
          type === "text/plain" ||
          type === "application/vnd.oasis.opendocument.text"
        );
      default:
        return false;
    }
  };

  const filteredDocuments = documents
    .filter(doc => {
      if (searchTerm === "") return true;
      return doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .filter(doc => matchesTab(doc, activeTab));

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getIconForFileType = (type: string) => {
    if (type.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (type.includes('word') || type.includes('docx')) {
      return <FileText className="h-10 w-10 text-blue-500" />;
    } else if (type.includes('powerpoint') || type.includes('pptx')) {
      return <FileText className="h-10 w-10 text-orange-500" />;
    } else if (type.includes('excel') || type.includes('xlsx')) {
      return <FileText className="h-10 w-10 text-green-500" />;
    } else if (type.includes('text')) {
      return <FileText className="h-10 w-10 text-gray-500" />;
    }
    return <FileIcon className="h-10 w-10 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center p-4">
                      <div className="rounded bg-muted p-2 mr-4">
                        {getIconForFileType(doc.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.filename}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{formatDate(doc.created_at)}</span>
                          <span className="mx-2">•</span>
                          <span>{doc.file_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(doc.file_url, '_blank');
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
