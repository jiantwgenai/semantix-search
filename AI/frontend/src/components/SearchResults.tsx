import React from 'react';
import { SearchResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, FileText, Calendar, FileIcon } from "lucide-react";
import { format } from "date-fns";

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  onResultClick: (document: SearchResult) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ 
  results, 
  searchQuery,
  onResultClick
}) => {
  if (!searchQuery || results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No results found</p>
      </div>
    );
  }

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
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'pptx':
        return <FileText className="h-8 w-8 text-orange-500" />;
      case 'xlsx':
        return <FileText className="h-8 w-8 text-green-500" />;
      case 'txt':
        return <FileText className="h-8 w-8 text-gray-500" />;
      default:
        return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{result.filename}</h3>
              <p className="text-sm text-gray-500">
                {result.file_type} • Uploaded {formatDate(result.created_at)}
              </p>
              {result.preview?.data && (
                <p className="mt-2 text-sm text-gray-700">
                  {result.preview.data}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Relevance: {(result.similarity * 100).toFixed(1)}%
              </p>
              <a
                href={result.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                View Document
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;
