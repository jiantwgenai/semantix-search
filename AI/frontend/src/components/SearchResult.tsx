import React from 'react';
import { SearchResult as SearchResultType } from '../types/document';
import { formatDate } from '../utils/dateUtils';
import { FileIcon } from './FileIcon';

interface SearchResultProps {
  result: SearchResultType;
}

export const SearchResult: React.FC<SearchResultProps> = ({ result }) => {
  const handleViewDocument = () => {
    window.open(result.document.url, '_blank');
  };

  const handleViewPreview = () => {
    window.open(result.document.url, '_blank');
  };

  // Function to decode the escaped text
  const decodeText = (text: string): string => {
    try {
      // If the text is already decoded, return it as is
      if (!text.includes('\\')) {
        return text;
      }
      
      // Replace escaped characters with their actual values
      return text.replace(/\\([0-7]{3})/g, (_, octal) => {
        return String.fromCharCode(parseInt(octal, 8));
      });
    } catch (error) {
      console.error('Error decoding text:', error);
      return text;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <FileIcon type={result.document.type} />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{result.document.name}</h3>
            <p className="text-sm text-gray-500">
              Uploaded on {formatDate(result.document.uploadDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-600">
            {result.relevanceScore.toFixed(1)}% match
          </span>
        </div>
      </div>

      {result.matchedText && (
        <div className="mt-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {decodeText(result.matchedText)}
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={handleViewPreview}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Preview
        </button>
        <button
          onClick={handleViewDocument}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Document
        </button>
      </div>
    </div>
  );
}; 