import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader } from 'react-reader';
import { ArrowLeft, Settings, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBook } from '@/hooks/useBooks';
import { useUserBookByBookId, useUpsertUserBook } from '@/hooks/useUserBooks';
import { useAuth } from '@/contexts/AuthContext';

const EpubReader = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: book, isLoading: bookLoading } = useBook(bookId || '');
  const { data: userBook } = useUserBookByBookId(user?.id || '', bookId || '');
  const upsertUserBook = useUpsertUserBook();

  const [location, setLocation] = useState<string | null>(null);
  const [showUI, setShowUI] = useState(true);
  const hideUITimeout = useRef<NodeJS.Timeout>();

  // Load saved location
  useEffect(() => {
    if (userBook?.last_location) {
      setLocation(userBook.last_location);
    }
  }, [userBook]);

  // Auto-hide UI after 3 seconds
  useEffect(() => {
    if (showUI) {
      hideUITimeout.current = setTimeout(() => {
        setShowUI(false);
      }, 3000);
    }

    return () => {
      if (hideUITimeout.current) {
        clearTimeout(hideUITimeout.current);
      }
    };
  }, [showUI]);

  const handleLocationChange = (epubcifi: string) => {
    setLocation(epubcifi);
    
    // Save location to database
    if (user && bookId) {
      upsertUserBook.mutate({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_location: epubcifi,
        started_at: userBook?.started_at || new Date().toISOString(),
      });
    }
  };

  const handleTap = () => {
    setShowUI(!showUI);
  };

  const handleBack = () => {
    // Save final location before leaving
    if (user && bookId && location) {
      upsertUserBook.mutate({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_location: location,
      });
    }
    navigate(-1);
  };

  if (bookLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4">
        <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Kitap bulunamadı</p>
        <Button onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    );
  }

  if (!book.epub_url) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4">
        <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Bu kitap için ePub dosyası bulunamadı</p>
        <Button onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background" onClick={handleTap}>
      {/* Header - Hidden when reading */}
      <div 
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background/95 backdrop-blur-sm border-b-2 border-border px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Button>
          <div className="text-center flex-1 mx-4">
            <p className="font-serif font-medium text-sm truncate">{book.title}</p>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ePub Reader */}
      <div className="h-full pt-0">
        <ReactReader
          url={book.epub_url!}
          location={location || undefined}
          locationChanged={handleLocationChange}
          showToc={showUI}
          epubOptions={{
            flow: 'scrolled',
            manager: 'continuous',
          }}
        />
      </div>

      {/* Bottom Progress Indicator */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          showUI ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background/95 backdrop-blur-sm border-t-2 border-border px-4 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Okumaya devam ediliyor...</span>
            <span>Dokunarak kontrolleri göster/gizle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpubReader;
