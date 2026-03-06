import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader } from 'react-reader';
import type { Rendition } from 'epubjs';
import { ArrowLeft, Settings, Loader2, BookOpen, Type, Sun, Moon, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBook } from '@/hooks/useBooks';
import { useUserBookByBookId, useUpsertUserBook } from '@/hooks/useUserBooks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type ReaderTheme = 'light' | 'dark' | 'sepia';

const THEMES: { key: ReaderTheme; label: string; icon: React.ReactNode; bg: string; fg: string; link: string }[] = [
  { key: 'light', label: 'Açık', icon: <Sun className="w-4 h-4" />, bg: '#ffffff', fg: '#1a1a1a', link: '#1a56db' },
  { key: 'sepia', label: 'Sepia', icon: <Coffee className="w-4 h-4" />, bg: '#f4ecd8', fg: '#5b4636', link: '#8b5e3c' },
  { key: 'dark', label: 'Koyu', icon: <Moon className="w-4 h-4" />, bg: '#1a1a2e', fg: '#d4d4d4', link: '#7eb8f7' },
];

function applyRenditionStyles(rendition: Rendition, theme: ReaderTheme, fontSize: number) {
  const t = THEMES.find(x => x.key === theme)!;
  rendition.themes.default({
    body: {
      'font-size': `${fontSize}px !important`,
      'color': `${t.fg} !important`,
      'background': `${t.bg} !important`,
      'line-height': '1.7 !important',
      'padding': '0 8px !important',
    },
    p: { 'color': `${t.fg} !important`, 'font-size': `${fontSize}px !important` },
    h1: { 'color': `${t.fg} !important` },
    h2: { 'color': `${t.fg} !important` },
    h3: { 'color': `${t.fg} !important` },
    a: { 'color': `${t.link} !important` },
    '*': { 'background': `${t.bg} !important` },
  });
  rendition.themes.select('__default');
}

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
  const renditionRef = useRef<Rendition | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout>();

  // Load saved cfi location
  useEffect(() => {
    if (userBook?.last_location) setLocation(userBook.last_location);
  }, [userBook]);

  // Auto-hide UI (pause when settings open)
  useEffect(() => {
    clearTimeout(hideTimeout.current);
    if (showUI && !showSettings) {
      hideTimeout.current = setTimeout(() => setShowUI(false), 3500);
    }
    return () => clearTimeout(hideTimeout.current);
  }, [showUI, showSettings]);

  // Re-apply styles whenever theme or fontSize changes
  useEffect(() => {
    if (renditionRef.current) {
      applyRenditionStyles(renditionRef.current, theme, fontSize);
    }
  }, [theme, fontSize]);

  const handleLocationChange = (cfi: string) => {
    setLocation(cfi);
    if (user && bookId) {
      upsertUserBook.mutate({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_location: cfi,
        started_at: userBook?.started_at || new Date().toISOString(),
      });
    }
  };

  const toggleUI = useCallback(() => {
    setShowSettings(false);
    setShowUI(v => !v);
  }, []);

  const handleBack = () => {
    if (user && bookId && location) {
      upsertUserBook.mutate({ user_id: user.id, book_id: bookId, status: 'reading', last_location: location });
    }
    navigate(-1);
  };

  const getRendition = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition;
    // Tap inside the epub iframe → toggle UI
    rendition.on('click', toggleUI);
    // Apply initial styles
    applyRenditionStyles(rendition, theme, fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

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
    <div className="fixed inset-0 transition-colors duration-300" style={{ background: currentTheme.bg }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-50 transition-all duration-300',
          showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Geri
          </Button>
          <p className="font-serif font-medium text-sm truncate flex-1 mx-4 text-center">{book.title}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setShowSettings(s => !s); setShowUI(true); }}
          >
            <Settings className={cn('w-4 h-4 transition-transform duration-200', showSettings && 'rotate-45')} />
          </Button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-background/98 backdrop-blur-md border-b border-border px-4 py-4 space-y-4">
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
                      theme === t.key ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                    )}
                    style={{ background: t.bg, color: t.fg }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide flex items-center gap-1">
                <Type className="w-3 h-3" /> Yazı Boyutu — {fontSize}px
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFontSize(s => Math.max(12, s - 2))}
                  className="w-10 h-10 rounded-xl bg-muted font-bold text-xl flex items-center justify-center hover:bg-accent transition-colors select-none"
                >−</button>
                <div className="flex-1 flex gap-1">
                  {[12, 14, 16, 18, 20, 22, 24].map(s => (
                    <button
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={cn(
                        'flex-1 h-2 rounded-full transition-all',
                        fontSize >= s ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setFontSize(s => Math.min(24, s + 2))}
                  className="w-10 h-10 rounded-xl bg-muted font-bold text-xl flex items-center justify-center hover:bg-accent transition-colors select-none"
                >+</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ePub Reader ────────────────────────────────────────── */}
      <div className="h-full">
        <ReactReader
          url={book.epub_url!}
          location={location || undefined}
          locationChanged={handleLocationChange}
          showToc={showUI && !showSettings}
          epubOptions={{ spread: 'none' }}
          getRendition={getRendition}
        />
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-50 transition-all duration-300',
          showUI ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">Ekrana dokun → kontrolleri göster/gizle</p>
        </div>
      </div>
    </div>
  );
};

export default EpubReader;
