import { useState, useEffect } from 'react';
import { Search, Loader2, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBookSearch, OpenLibraryBook } from '@/hooks/useBookSearch';
import { cn } from '@/lib/utils';

interface BookSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBook: (book: {
    title: string;
    author: string;
    pages: number;
    cover_url: string | null;
    genre: string | null;
  }) => void;
}

const BookSearchDialog = ({ open, onOpenChange, onSelectBook }: BookSearchDialogProps) => {
  const [query, setQuery] = useState('');
  const { searchBooks, results, isSearching, getCoverUrl, clearResults } = useBookSearch();

  useEffect(() => {
    if (!open) {
      setQuery('');
      clearResults();
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchBooks(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (book: OpenLibraryBook) => {
    onSelectBook({
      title: book.title,
      author: book.author_name?.[0] || 'Bilinmeyen Yazar',
      pages: book.number_of_pages_median || 0,
      cover_url: getCoverUrl(book.cover_i, 'L'),
      genre: book.subject?.[0] || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="font-serif">Kitap Ara</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kitap adı veya yazar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((book) => {
                const coverUrl = getCoverUrl(book.cover_i, 'S');
                
                return (
                  <button
                    key={book.key}
                    onClick={() => handleSelect(book)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                      "hover:bg-muted"
                    )}
                  >
                    {coverUrl ? (
                      <img 
                        src={coverUrl} 
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{book.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {book.author_name?.[0] || 'Bilinmeyen Yazar'}
                      </p>
                      {book.first_publish_year && (
                        <p className="text-xs text-muted-foreground">
                          {book.first_publish_year}
                        </p>
                      )}
                      {book.number_of_pages_median && (
                        <p className="text-xs text-muted-foreground">
                          {book.number_of_pages_median} sayfa
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Kitap bulunamadı</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Kitap aramak için yazın</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BookSearchDialog;
