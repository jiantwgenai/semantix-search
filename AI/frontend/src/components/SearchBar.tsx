
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, Sparkles } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string, options: SearchOptions) => void;
}

interface SearchOptions {
  mode: "semantic" | "keyword";
  timeFrame?: string;
  fileTypes?: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    mode: "semantic",
    timeFrame: "all",
    fileTypes: []
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSearch(query, searchOptions);
    setIsSearching(false);
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <Input
          type="text"
          placeholder="Search documents using natural language queries..."
          className="pl-10 pr-24 py-6 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <span className="hidden sm:inline">Options</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuRadioGroup
                value={searchOptions.mode}
                onValueChange={(value) => 
                  setSearchOptions({
                    ...searchOptions, 
                    mode: value as "semantic" | "keyword"
                  })
                }
              >
                <DropdownMenuRadioItem value="semantic">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    <span>Semantic Search</span>
                  </div>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="keyword">Keyword Search</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          type="submit" 
          className="px-8" 
          disabled={!query.trim() || isSearching}
        >
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>
    </form>
  );
};

export default SearchBar;
