// semantix-document-search/src/pages/Index.tsx
import { useState, useEffect } from "react";
import { Document, SearchResult } from "@/types";
import Sidebar from "@/components/Sidebar";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentList from "@/components/DocumentList";
import SearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import DocumentPreview from "@/components/DocumentPreview";
import { useToast } from "@/components/ui/use-toast";
import Login from "@/components/Login";
import { searchDocuments, logout } from '@/lib/api';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Current auth token:', token);
    console.log('Is authenticated:', !!token);
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out",
        variant: "destructive"
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md p-6">
          <Login onSuccess={() => setIsAuthenticated(true)} />
        </div>
      </div>
    );
  }

  const handleSearch = async (query: string, options: { mode: "semantic" | "keyword" }) => {
    setSearchQuery(query);
    try {
      console.log('Starting search with:', { query, options });
      const backendResults = await searchDocuments(query, options);
      console.log('Search results:', backendResults);
      
      // Pass the backend results directly
      setSearchResults(backendResults);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An error occurred while searching",
        variant: "destructive"
      });
      setSearchResults([]);
    }
  };

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "search":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Search Documents</h2>
            <SearchBar onSearch={handleSearch} />
            {(searchQuery || searchResults.length > 0) && (
              <div className="mt-6">
                <h3 className="text-xl font-medium mb-4">Search Results</h3>
                <SearchResults 
                  results={searchResults} 
                  searchQuery={searchQuery}
                  onResultClick={handleDocumentSelect}
                />
              </div>
            )}
          </div>
        );
      case "upload":
        return <DocumentUpload />;
      case "documents":
        return <DocumentList onDocumentSelect={handleDocumentSelect} />;
      default:
        return <DocumentUpload />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="container mx-auto">
          {renderSectionContent()}
        </div>
      </main>
      
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
};

export default Index;