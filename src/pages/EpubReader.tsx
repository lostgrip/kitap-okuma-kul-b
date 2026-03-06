import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader, ReactReaderStyle } from 'react-reader';
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

/** Applies font & color to rendered epub content (inside iframe) */
function applyRenditionStyles(rendition: Rendition, theme: ReaderTheme, fontSize: number) {
  const t = THEMES.find(x => x.key === theme)!;
  rendition.themes.default({
    html: { background: `${t.bg} !important` },
    body: {
      'font-size': `${fontSize}px !important`,
      color: `${t.fg} !important`,
      background: `${t.bg} !important`,
      'line-height': '1.75 !important',
      padding: '0 6px !important',
    },
    p: { color: `${t.fg} !important`, 'font-size': `${fontSize}px !important` },
    h1: { color: `${t.fg} !important` },
    h2: { color: `${t.fg} !important` },
    h3: { color: `${t.fg} !important` },
    a: { color: `${t.link} !important` },
  });
}

/** Builds ReactReader style overrides so the outer container matches the theme */
function buildReaderStyles(bg: string) {
  return {
    ...ReactReaderStyle,
    container: { ...ReactReaderStyle.container, background: bg },
    readerArea: { ...ReactReaderStyle.readerArea, background: bg, transition: 'background 0.3s' },
    containerExpanded: { ...ReactReaderStyle.containerExpanded, background: bg },
  };
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
  const [fadeOverlay, setFadeOverlay] = useState<{ color: string; opacity: number }>({ color: '', opacity: 0 });

  const renditionRef = useRef<Rendition | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout>();

  // Load saved cfi
  useEffect(() => {
    if (userBook?.last_location) setLocation(userBook.last_location);
  }, [userBook]);

  // Auto-hide UI
  useEffect(() => {
    clearTimeout(hideTimeout.current);
    if (showUI && !showSettings) {
      hideTimeout.current = setTimeout(() => setShowUI(false), 3500);
    }
    return () => clearTimeout(hideTimeout.current);
  }, [showUI, showSettings]);

  // Re-apply content styles when theme/fontSize changes
  useEffect(() => {
    if (renditionRef.current) applyRenditionStyles(renditionRef.current, theme, fontSize);
  }, [theme, fontSize]);

  // iOS-style crossfade theme transition
  const handleThemeChange = useCallback((newTheme: ReaderTheme) => {
    if (newTheme === theme) return;
    const t = THEMES.find(x => x.key === newTheme)!;

    // 1. Fade overlay in
    setFadeOverlay({ color: t.bg, opacity: 1 });
    // 2. Apply theme at peak opacity
    setTimeout(() => setTheme(newTheme), 200);
    // 3. Fade out
    setTimeout(() => setFadeOverlay(f => ({ ...f, opacity: 0 })), 220);
  }, [theme]);

  // Mouse wheel + touch swipe: attach to iframe document via rendition
  // (window-level listeners don't fire inside the epub iframe)
  const attachScrollListeners = useCallback((doc: Document) => {
    doc.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 30) renditionRef.current?.next();
      else if (e.deltaY < -30) renditionRef.current?.prev();
    }, { passive: false });

    let startY = 0;
    doc.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    doc.addEventListener('touchend', (e) => {
      const diff = startY - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 60) {
        if (diff > 0) renditionRef.current?.next();
        else renditionRef.current?.prev();
      }
    }, { passive: true });
  }, []);

  const handleLocationChange = (cfi: string) => {
    setLocation(cfi);
    if (user && bookId) {
      upsertUserBook.mutate({
        user_id: user.id, book_id: bookId, status: 'reading',
        last_location: cfi,
        started_at: userBook?.started_at || new Date().toISOString(),
      });
    }
  };

  const handleBack = () => {
    if (user && bookId && location)
      upsertUserBook.mutate({ user_id: user.id, book_id: bookId, status: 'reading', last_location: location });
    navigate(-1);
  };

  const getRendition = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition;
    rendition.on('click', () => {
      if (showSettings) { setShowSettings(false); return; }
      setShowUI(v => !v);
    });
    // Attach scroll/swipe listeners to the iframe document after each render
    rendition.on('rendered', (_section: unknown, view: { document: Document }) => {
      if (view?.document) attachScrollListeners(view.document);
    });
    applyRenditionStyles(rendition, theme, fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachScrollListeners]);

  const currentTheme = THEMES.find(t => t.key === theme)!;

  if (bookLoading) return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!book) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4">
      <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">Kitap bulunamadı</p>
      <Button onClick={() => navigate(-1)}>Geri Dön</Button>
    </div>
  );

  if (!book.epub_url) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4">
      <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">Bu kitap için ePub dosyası bulunamadı</p>
      <Button onClick={() => navigate(-1)}>Geri Dön</Button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 transition-colors duration-300"
      style={{ background: currentTheme.bg }}
    >
      {/* ── Header ── */}
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
            variant="ghost" size="icon"
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
                    onClick={() => handleThemeChange(t.key)}
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

            {/* Font size */}
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
                    <button key={s} onClick={() => setFontSize(s)}
                      className={cn('flex-1 h-2 rounded-full transition-all', fontSize >= s ? 'bg-primary' : 'bg-muted')}
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

      {/* ── Reader ── */}
      <div className="h-full w-full">
        <ReactReader
          url={book.epub_url!}
          location={location || undefined}
          locationChanged={handleLocationChange}
          showToc={showUI && !showSettings}
          epubOptions={{ spread: 'none' }}
          readerStyles={buildReaderStyles(currentTheme.bg)}
          getRendition={getRendition}
        />
      </div>

      {/* ── Bottom bar ── */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-50 transition-all duration-300',
          showUI ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <div className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground text-center">Dokunarak kontrolleri göster/gizle · Kaydır sayfa geç</p>
        </div>
      </div>


      {/* ── iOS-style Fade Overlay ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          pointerEvents: 'none',
          background: fadeOverlay.color || 'transparent',
          opacity: fadeOverlay.opacity,
          transition: fadeOverlay.opacity === 1
            ? 'opacity 0.18s ease-in'
            : 'opacity 0.32s ease-out',
        }}
      />

    </div>
  );
};

export default EpubReader;
