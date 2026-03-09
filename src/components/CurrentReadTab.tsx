import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, Leaf, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QuoteOfTheDay from './QuoteOfTheDay';
import MindfulProgressCard from './MindfulProgressCard';
import DailyCheckIns from './DailyCheckIns';
import ZenReadingSession from './ZenReadingSession';
import ClubProgress from './ClubProgress';
import { useBooks } from '@/hooks/useBooks';
import { useAllProgress, useUpsertProgress, useDeleteProgress } from '@/hooks/useProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useReadingLog, useAddReadingLog } from '@/hooks/useReadingLog';
import { useUserBooks } from '@/hooks/useUserBooks';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAddBookToDefaultList } from '@/hooks/useBookListActions';

const CurrentReadTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const { data: allProgress = [], isLoading: progressLoading } = useAllProgress();
  const { data: _goals = [] } = useGoals(user?.id);
  const { data: _logs = [] } = useReadingLog(user?.id || '');
  const { data: userBooks = [] } = useUserBooks(user?.id || '');
  const upsertProgress = useUpsertProgress();
  const deleteProgress = useDeleteProgress();
  const addReadingLog = useAddReadingLog();
  const { data: schedule = [] } = useClubSchedule();
  const addToDefaultList = useAddBookToDefaultList();

  const [inputPage, setInputPage] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);

  // Auto-sync legacy reading data to default book lists (debounced, runs once per session)
  useEffect(() => {
    if (!user) return;
    const syncKey = `autoSync_${user.id}`;
    if (sessionStorage.getItem(syncKey)) return;
    sessionStorage.setItem(syncKey, '1');

    const autoSyncLists = async () => {
      const [{ data: lists }, { data: uBooks }] = await Promise.all([
        supabase
          .from('book_lists')
          .select('id, list_type')
          .eq('user_id', user.id)
          .eq('is_default', true),
        supabase
          .from('user_books')
          .select('book_id, status')
          .eq('user_id', user.id),
      ]);

      if (!lists?.length || !uBooks?.length) return;

      const listIds = lists.map(l => l.id);
      const { data: existingItems } = await supabase
        .from('book_list_items')
        .select('list_id, book_id')
        .in('list_id', listIds);

      const existingSet = new Set(
        (existingItems || []).map(i => `${i.list_id}:${i.book_id}`)
      );

      for (const ub of uBooks) {
        const targetList = lists.find(l => l.list_type === ub.status);
        if (targetList && !existingSet.has(`${targetList.id}:${ub.book_id}`)) {
          await supabase
            .from('user_books')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', ub.book_id);

          if (ub.status === 'reading') {
            await supabase
              .from('reading_progress')
              .delete()
              .eq('user_id', user.id)
              .eq('book_id', ub.book_id);
          }
        }
      }
    };

    autoSyncLists();
  }, [user]);

  const activeClubBookIds = schedule.filter(s => s.status === 'active').map(s => s.book_id);

  const userReadingBookIds = Array.from(new Set([
    ...allProgress.filter(p => p.user_id === user?.id && p.status === 'reading').map(p => p.book_id),
    ...userBooks.filter(b => b.status === 'reading').map(b => b.book_id),
    ...activeClubBookIds,
  ]));

  const userReadingBooks = books.filter(b => userReadingBookIds.includes(b.id));

  const currentBook = selectedBookId
    ? books.find(b => b.id === selectedBookId)
    : userReadingBooks[0] || null;

  const userProgress = allProgress.find(
    p => p.user_id === user?.id && p.book_id === currentBook?.id
  );
  const userCurrentPage = userProgress?.current_page || 0;

  const isLoading = booksLoading || progressLoading;

  if (isLoading) {
    return (
      <div className="px-5 pt-8 pb-24 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBook && userReadingBooks.length === 0) {
    return (
      <div className="px-5 pt-8 pb-24 animate-fade-in space-y-6">
        <QuoteOfTheDay />
        <div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Şu Anda Okunan</p>
          <h1 className="text-xl font-serif font-bold text-foreground mt-1">Kitap Seçilmedi</h1>
        </div>
        <div className="bg-card rounded-2xl p-8 shadow-card text-center border border-border/40">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/25 mb-4" />
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px] mx-auto">
            Şu an okuduğunuz bir kitap görünmüyor. Kütüphanenizden yeni bir yolculuğa başlayabilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  const displayBook = currentBook;
  if (!displayBook) return null;

  const totalPages = displayBook.page_count;
  const isClubBook = schedule.some(s => s.book_id === displayBook.id && s.status === 'active');

  const handleUpdateProgress = async () => {
    const newPage = parseInt(inputPage);
    if (isNaN(newPage) || newPage < 0 || !user) {
      toast.error('Geçerli bir sayfa numarası girin');
      return;
    }

    if (totalPages > 0 && newPage > totalPages) {
      try {
        await supabase.from('books').update({ page_count: newPage }).eq('id', displayBook.id);
      } catch { /* non-blocking */ }
    }

    try {
      const newStatus = (totalPages > 0 && newPage >= totalPages) ? 'completed' : 'reading';
      await upsertProgress.mutateAsync({
        user_id: user.id,
        book_id: displayBook.id,
        current_page: newPage,
        status: newStatus,
      });

      try {
        await addToDefaultList.mutateAsync({
          bookId: displayBook.id,
          listType: newStatus === 'completed' ? 'read' : 'reading'
        });
      } catch (e) {
        console.error("List sync error:", e);
      }

      const pagesRead = newPage - userCurrentPage;
      if (pagesRead > 0) {
        await addReadingLog.mutateAsync({
          user_id: user.id,
          book_id: displayBook.id,
          pages_read: pagesRead,
          current_page: newPage
        });
      }

      setInputPage('');
      toast.success('Huzurlu okumalar, ilerleme kaydedildi 🌱');
    } catch {
      toast.error('İlerleme kaydedilirken hata oluştu');
    }
  };

  return (
    <div className="px-5 pt-8 pb-24 max-w-lg mx-auto">
      {/* Staggered entrance animations */}
      <div className="animate-fade-in space-y-6">
        <QuoteOfTheDay />
        <DailyCheckIns />
        <ClubProgress />
      </div>

      {/* Header */}
      <div className="mb-6 text-center animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-[0.15em] mb-1.5">Şu Anda Okunan</p>
        <button
          onClick={() => navigate(`/book/${displayBook.id}`)}
          className="inline-flex items-center gap-2 group"
        >
          <h1 className="text-xl font-serif font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">{displayBook.title}</h1>
          {isClubBook && (
            <span title="Kulüp Ortak Kitabı">
              <Crown className="w-4 h-4 text-amber flex-shrink-0" />
            </span>
          )}
        </button>
        <p className="text-muted-foreground mt-1 text-sm">{displayBook.author}</p>
      </div>

      {/* Book Selection (if multiple) */}
      {userReadingBooks.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 justify-center scrollbar-none">
          {userReadingBooks.map(book => (
            <button
              key={book.id}
              onClick={() => setSelectedBookId(book.id)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
                (selectedBookId === book.id || (!selectedBookId && book.id === userReadingBooks[0]?.id))
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {book.title}
            </button>
          ))}
        </div>
      )}

      {/* Book Cover */}
      <div className="flex justify-center mb-12 animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
        <button
          onClick={() => navigate(`/book/${displayBook.id}`)}
          className="relative group w-36 sm:w-40 transition-all duration-300 hover:-translate-y-2 active:scale-[0.97]"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 -z-10 translate-y-6 scale-95 opacity-50 blur-2xl transition-all duration-300 group-hover:opacity-70 group-hover:blur-3xl group-hover:translate-y-8" aria-hidden="true">
            <img
              src={displayBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
              alt=""
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>

          {/* Actual Cover */}
          <div className="relative rounded-2xl overflow-hidden shadow-elevated group-hover:shadow-card">
            <img
              src={displayBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
              alt={displayBook.title}
              className="w-full h-auto object-cover aspect-[2/3] transform transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop';
              }}
            />
          </div>
        </button>
      </div>

      {/* Progress Card */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <MindfulProgressCard
          bookTitle={displayBook.title}
          bookCover={displayBook.cover_url}
          currentPage={userCurrentPage}
          totalPages={totalPages}
        />
      </div>

      {/* Update Progress */}
      <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40 mb-8 animate-fade-in" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
        <h3 className="font-serif font-medium text-center text-foreground mb-4 flex items-center justify-center gap-2 text-sm">
          <Leaf className="w-4 h-4 text-forest" />
          Okumaya devam et
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="number"
            placeholder="Kaldığınız sayfa..."
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            min={1}
            className="flex-1 h-11 text-center rounded-xl"
          />
          <Button
            onClick={handleUpdateProgress}
            className="h-11 px-6 rounded-xl font-medium"
            disabled={upsertProgress.isPending}
          >
            {upsertProgress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
          </Button>
        </div>

        {userProgress && (
          <div className="mt-4 text-center">
            <button
              className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors duration-200"
              onClick={async () => {
                if (!user) return;
                try {
                  await deleteProgress.mutateAsync({
                    user_id: user.id,
                    book_id: displayBook.id,
                  });
                  try {
                    await addToDefaultList.mutateAsync({
                      bookId: displayBook.id,
                      listType: 'dnf',
                    });
                  } catch { /* non-blocking */ }
                  toast.success('Kitap "Yarıda Bıraktım" listesine taşındı 🌱');
                  if (selectedBookId === displayBook.id) setSelectedBookId(null);
                } catch {
                  toast.error('Hata oluştu');
                }
              }}
              disabled={deleteProgress.isPending}
            >
              Belki daha sonra okurum (Listeden çıkar)
            </button>
          </div>
        )}
      </div>

      {/* Zen Focus Mode */}
      <div className="text-center pb-4">
        <button
          onClick={() => setIsZenMode(true)}
          className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-300 tracking-[0.15em] font-serif"
        >
          ✦ Odak Moduna Gir
        </button>
      </div>

      {isZenMode && <ZenReadingSession onClose={() => setIsZenMode(false)} />}
    </div>
  );
};

export default CurrentReadTab;
