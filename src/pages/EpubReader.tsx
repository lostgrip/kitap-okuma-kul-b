import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactReader, ReactReaderStyle } from 'react-reader';
import type { Rendition } from 'epubjs';
import { ArrowLeft, Settings, Loader2, BookOpen, Type, Sun, Moon, Coffee, CloudRain, TreePine, Flame, VolumeX } from 'lucide-react';
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

const AMBIENCE_SOUNDS = [
  { id: 'none', label: 'Sessiz', icon: <VolumeX className="w-4 h-4" />, url: null },
  { id: 'rain', label: 'Yağmur', icon: <CloudRain className="w-4 h-4" />, url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  { id: 'forest', label: 'Orman', icon: <TreePine className="w-4 h-4" />, url: 'https://actions.google.com/sounds/v1/environment/forest_morning.ogg' },
  { id: 'cafe', label: 'Kafe', icon: <Coffee className="w-4 h-4" />, url: 'https://actions.google.com/sounds/v1/crowds/cafe_restaurant_ambience.ogg' },
];

/** Applies font & color to rendered epub content (inside iframe) */
function applyRenditionStyles(rendition: Rendition, theme: ReaderTheme, fontSize: number) {
  const t = THEMES.find(x => x.key === theme)!;
  rendition.themes.default({
    html: {
      background: `${t.bg} !important`,
      transition: 'background 0.3s ease !important'
    },
    body: {
      'font-size': `${fontSize}px !important`,
      color: `${t.fg} !important`,
      background: `${t.bg} !important`,
      'line-height': '1.75 !important',
      padding: '0 6px !important',
      transition: 'background 0.3s ease, color 0.3s ease !important'
    },
    p: {
      color: `${t.fg} !important`,
      'font-size': `${fontSize}px !important`,
      transition: 'color 0.3s ease !important'
    },
    h1: { color: `${t.fg} !important`, transition: 'color 0.3s ease !important' },
    h2: { color: `${t.fg} !important`, transition: 'color 0.3s ease !important' },
    h3: { color: `${t.fg} !important`, transition: 'color 0.3s ease !important' },
    a: { color: `${t.link} !important`, transition: 'color 0.3s ease !important' },
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
  const [ambientSound, setAmbientSound] = useState<string>('none');
  const [audioVolume, setAudioVolume] = useState(0.5);

  const renditionRef = useRef<Rendition | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout>();
  // Debounce timer ref for location saves — avoids a DB write on every page flip
  const saveDebounce = useRef<NodeJS.Timeout>();
  // Keep a ref of the latest location so handleBack can flush without stale closure
  const latestLocationRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Handle Audio playback
  useEffect(() => {
    if (ambientSound === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    const sound = AMBIENCE_SOUNDS.find(s => s.id === ambientSound);
    if (!sound || !sound.url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    audioRef.current.src = sound.url;
    audioRef.current.volume = audioVolume;
    audioRef.current.play().catch(e => console.error("Audio play blocked", e));
  }, [ambientSound, audioVolume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Ultra-smooth Apple-style theme change
  const handleThemeChange = useCallback((newTheme: ReaderTheme) => {
    if (newTheme === theme) return;
    setTheme(newTheme);
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

  const handleLocationChange = useCallback((cfi: string) => {
    setLocation(cfi);
    latestLocationRef.current = cfi;
    if (!user || !bookId) return;
    // Debounce: only persist after reader is idle for 1.5s
    clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(() => {
      upsertUserBook.mutate({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_location: cfi,
        started_at: userBook?.started_at || new Date().toISOString(),
      });
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bookId, userBook?.started_at]);

  const handleBack = useCallback(() => {
    // Flush any pending save immediately before navigating away
    clearTimeout(saveDebounce.current);
    if (user && bookId && latestLocationRef.current) {
      upsertUserBook.mutate({
        user_id: user.id,
        book_id: bookId,
        status: 'reading',
        last_location: latestLocationRef.current,
      });
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    navigate(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bookId]);

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
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
                  className="w-11 h-11 rounded-xl bg-muted font-bold text-xl flex items-center justify-center hover:bg-accent transition-colors select-none"
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

            {/* Ambient Sounds */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide flex justify-between items-center">
                <span>Ambiyans (Odak Modu)</span>
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {AMBIENCE_SOUNDS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setAmbientSound(s.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all whitespace-nowrap',
                      ambientSound === s.id ? 'border-primary ring-2 ring-primary/30 text-primary' : 'border-border text-foreground hover:bg-muted'
                    )}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {ambientSound !== 'none' && (
                <div className="mt-2 flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={audioVolume}
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                </div>
              )}
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



      {/* No more overlays, just pure CSS crossfade inside the iframe and on the container */}
    </div>
  );
};

export default EpubReader;
