import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader, ReactReaderStyle } from 'react-reader';
import { ArrowLeft, Settings, Loader2, BookOpen, Type, Sun, Moon, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBook } from '@/hooks/useBooks';
import { useUserBookByBookId, useUpsertUserBook } from '@/hooks/useUserBooks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type ReaderTheme = 'light' | 'dark' | 'sepia';

const THEMES: { key: ReaderTheme; label: string; icon: React.ReactNode; bg: string; fg: string }[] = [
  { key: 'light', label: 'Açık', icon: <Sun className="w-4 h-4" />, bg: '#ffffff', fg: '#1a1a1a' },
  { key: 'sepia', label: 'Sepia', icon: <Coffee className="w-4 h-4" />, bg: '#f4ecd8', fg: '#5b4636' },
  { key: 'dark', label: 'Koyu', icon: <Moon className="w-4 h-4" />, bg: '#1a1a2e', fg: '#e0e0e0' },
];

const FONT_SIZES = [14, 16, 18, 20, 22, 24];

const getReaderStyle = (theme: ReaderTheme, fontSize: number) => ({
  ...ReactReaderStyle,
  readerArea: {
    ...ReactReaderStyle.readerArea,
    background: THEMES.find(t => t.key === theme)?.bg || '#ffffff',
    transition: 'background 0.3s',
  },
  containerExpanded: {
    ...ReactReaderStyle.containerExpanded,
    background: THEMES.find(t => t.key === theme)?.bg || '#ffffff',
  },
});

const EpubReader = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: book, isLoading: bookLoading } = useBook(bookId || '');
  const { data: userBook } = useUserBookByBookId(user?.id || '', bookId || '');
  const upsertUserBook = useUpsertUserBook();

  const [location, setLocation] = useState<string | null>(null);
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [fontSize, setFontSize] = useState(18);
  const hideUITimeout = useRef<NodeJS.Timeout>();

  // Load saved location
  useEffect(() => {
    if (userBook?.last_location) {
      setLocation(userBook.last_location);
    }
  }, [userBook]);

  // Auto-hide UI after 3 seconds (not when settings open)
  useEffect(() => {
    if (showUI && !showSettings) {
      hideUITimeout.current = setTimeout(() => {
        setShowUI(false);
      }, 3000);
    }
    return () => { if (hideUITimeout.current) clearTimeout(hideUITimeout.current); };
  }, [showUI, showSettings]);

  const handleLocationChange = (epubcifi: string) => {
    setLocation(epubcifi);
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
    if (showSettings) { setShowSettings(false); return; }
    setShowUI(!showUI);
  };

  const handleBack = () => {
    if (user && bookId && location) {
      upsertUserBook.mutate({ user_id: user.id, book_id: bookId, status: 'reading', last_location: location });
    }
    navigate(-1);
  };

  const currentTheme = THEMES.find(t => t.key === theme)!;

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
    <div className="fixed inset-0" style={{ background: currentTheme.bg }} onClick={handleTap}>
      {/* Header */}
      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Button>
          <div className="text-center flex-1 mx-4">
            <p className="font-serif font-medium text-sm truncate">{book.title}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setShowUI(true); }}
          >
            <Settings className={cn('w-4 h-4 transition-transform duration-200', showSettings && 'rotate-45')} />
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div
            className="bg-background/98 backdrop-blur-md border-b border-border px-4 py-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Theme */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Tema</p>
              <div className="flex gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                      theme === t.key ? 'border-primary' : 'border-border'
                    )}
                    style={{ background: t.bg, color: t.fg }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide flex items-center gap-1">
                <Type className="w-3 h-3" /> Yazı Boyutu
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(s => Math.max(FONT_SIZES[0], s - 2))}
                  className="w-9 h-9 rounded-xl bg-muted font-bold text-lg flex items-center justify-center hover:bg-accent transition-colors"
                >−</button>
                <span className="flex-1 text-center font-medium text-sm">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(s => Math.min(FONT_SIZES[FONT_SIZES.length - 1], s + 2))}
                  className="w-9 h-9 rounded-xl bg-muted font-bold text-lg flex items-center justify-center hover:bg-accent transition-colors"
                >+</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ePub Reader */}
      <div className="h-full">
        <ReactReader
          url={book.epub_url!}
          location={location || undefined}
          locationChanged={handleLocationChange}
          showToc={showUI && !showSettings}
          epubOptions={{ spread: 'none' }}
          readerStyles={getReaderStyle(theme, fontSize)}
          epubInitOptions={{ openAs: 'epub' }}
          getRendition={(rendition) => {
            rendition.themes.default({
              body: {
                'font-size': `${fontSize}px !important`,
                'color': `${currentTheme.fg} !important`,
                'background': `${currentTheme.bg} !important`,
              }
            });
          }}
        />
      </div>

      {/* Bottom bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">Dokunarak kontrolleri göster/gizle</p>
        </div>
      </div>
    </div>
  );
};

export default EpubReader;
