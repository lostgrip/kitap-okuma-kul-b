import { useState, useCallback } from 'react';

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export interface GoogleBooksSearchResult {
  totalItems: number;
  items?: GoogleBook[];
}

export const useGoogleBooks = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchBooks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Prioritize Turkish results with langRestrict
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=tr&maxResults=15&printType=books`
      );

      if (!response.ok) throw new Error('Arama başarısız');

      const data: GoogleBooksSearchResult = await response.json();
      setResults(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getCoverUrl = (book: GoogleBook, size: 'small' | 'medium' = 'medium') => {
    const imageLinks = book.volumeInfo.imageLinks;
    if (!imageLinks) return null;
    
    // Get higher quality image by replacing zoom parameter
    const baseUrl = imageLinks.thumbnail || imageLinks.smallThumbnail;
    if (!baseUrl) return null;
    
    // Upgrade to larger image
    return baseUrl.replace('zoom=1', 'zoom=2').replace('http:', 'https:');
  };

  const clearResults = useCallback(() => setResults([]), []);

  return {
    searchBooks,
    results,
    isSearching,
    error,
    getCoverUrl,
    clearResults,
  };
};
