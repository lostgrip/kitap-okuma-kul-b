import { useState } from 'react';

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_publish_year?: number;
  subject?: string[];
}

export interface SearchResult {
  docs: OpenLibraryBook[];
  numFound: number;
}

export const useBookSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchBooks = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year,subject`
      );
      
      if (!response.ok) throw new Error('Arama başarısız');
      
      const data: SearchResult = await response.json();
      setResults(data.docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getCoverUrl = (coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M') => {
    if (!coverId) return null;
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  };

  return {
    searchBooks,
    results,
    isSearching,
    error,
    getCoverUrl,
    clearResults: () => setResults([]),
  };
};
