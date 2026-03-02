import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface CombinedBookResult {
  id: string;
  title: string;
  author: string;
  pages: number;
  coverUrl: string | null;
  genre: string | null;
  description: string | null;
  publishYear?: number;
  publisher?: string | null;
  language?: string;
  source: 'google' | 'openlibrary';
}

export const useCombinedBookSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<CombinedBookResult[]>([]);

  const searchBooks = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Detect if query looks like an ISBN (10 or 13 digits, optionally with dashes)
      const isbnClean = query.replace(/[-\s]/g, '');
      const isISBN = /^(\d{10}|\d{13})$/.test(isbnClean);
      const googleQuery = isISBN ? `isbn:${isbnClean}` : query;

      const [googleRes, olRes] = await Promise.allSettled([
        fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(googleQuery)}&maxResults=15&printType=books`
        ).then(r => r.ok ? r.json() : Promise.reject()),
        fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year,subject,publisher`
        ).then(r => r.ok ? r.json() : Promise.reject()),
      ]);

      const combined: CombinedBookResult[] = [];
      const seen = new Set<string>();

      // Google Books results (priority)
      if (googleRes.status === 'fulfilled' && googleRes.value.items) {
        for (const item of googleRes.value.items) {
          const v = item.volumeInfo;
          const publisherStr = v.publisher ? v.publisher.toLowerCase() : 'unknown';
          const key = `${v.title?.toLowerCase()}-${v.authors?.[0]?.toLowerCase()}-${publisherStr}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const thumb = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
          combined.push({
            id: `g-${item.id}`,
            title: v.title,
            author: v.authors?.[0] || 'Bilinmeyen Yazar',
            pages: v.pageCount || 0,
            coverUrl: thumb ? thumb.replace('zoom=1', 'zoom=3').replace('http:', 'https:') : null,
            genre: v.categories?.[0] || null,
            description: v.description || null,
            publishYear: v.publishedDate ? parseInt(v.publishedDate.split('-')[0]) : undefined,
            publisher: v.publisher || null,
            language: v.language,
            source: 'google',
          });
        }
      }

      // Open Library results
      if (olRes.status === 'fulfilled' && olRes.value.docs) {
        const lowerQuery = query.toLowerCase();
        for (const doc of olRes.value.docs) {
          // Attempt to find a publisher that matches the user's query keywords
          let matchedPublisher = doc.publisher?.[0];
          if (doc.publisher && doc.publisher.length > 1) {
            const tokens = lowerQuery.split(' ').filter(t => t.length > 2);
            const found = doc.publisher.find((p: string) =>
              tokens.some(token => p.toLowerCase().includes(token))
            );
            if (found) matchedPublisher = found;
          }

          const publisherStr = matchedPublisher ? matchedPublisher.toLowerCase() : 'unknown';
          const key = `${doc.title?.toLowerCase()}-${doc.author_name?.[0]?.toLowerCase()}-${publisherStr}`;
          if (seen.has(key)) continue;
          seen.add(key);

          combined.push({
            id: `ol-${doc.key}`,
            title: doc.title,
            author: doc.author_name?.[0] || 'Bilinmeyen Yazar',
            pages: doc.number_of_pages_median || 0,
            coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
            genre: doc.subject?.[0] || null,
            description: null,
            publishYear: doc.first_publish_year,
            publisher: matchedPublisher || null,
            source: 'openlibrary',
          });
        }
      }

      if (combined.length === 0 && googleRes.status === 'rejected' && olRes.status === 'rejected') {
        toast.error('Sistem hatası: Arama yapılamadı');
      }

      setResults(combined);
    } catch {
      toast.error('Sistem hatası: Arama yapılamadı');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchBooks,
    results,
    isSearching,
    clearResults: () => setResults([]),
  };
};
