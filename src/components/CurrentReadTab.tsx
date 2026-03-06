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
  const { data: goals = [] } = useGoals(user?.id);
  const { data: logs = [] } = useReadingLog(user?.id || '');
  const { data: userBooks = [] } = useUserBooks(user?.id || '');
  const upsertProgress = useUpsertProgress();
  const deleteProgress = useDeleteProgress();
  const addReadingLog = useAddReadingLog();
  const { data: schedule = [] } = useClubSchedule();
  const addToDefaultList = useAddBookToDefaultList();

  const [inputPage, setInputPage] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);

  // Auto-sync legacy reading data to default book lists
  useEffect(() => {
    const autoSyncLists = async () => {
      if (!user) return;

      const { data: lists } = await supabase
        .from('book_lists')
        .select('id, list_type')
        .eq('user_id', user.id)
        .eq('is_default', true);

      if (!lists || lists.length === 0) return;

      const { data: uBooks } = await supabase
        .from('user_books')
        .select('book_id, status')
        .eq('user_id', user.id);

      if (uBooks && uBooks.length > 0) {
        for (const ub of uBooks) {
          const targetList = lists.find(l => l.list_type === ub.status);
          if (targetList) {
            const { data: existing } = await supabase
              .from('book_list_items')
              .select('id')
              .eq('list_id', targetList.id)
              .eq('book_id', ub.book_id)
              .maybeSingle();

            // If the book is completely missing from the target list, it means the user deleted it.
            // We must clear the ghost data from user_books and reading_progress.
            if (!existing) {
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
        }
      }
    };

    autoSyncLists();
  }, [user]);

  // Get active club book IDs — these always appear in Currently Reading for everyone
  const activeClubBookIds = schedule.filter(s => s.status === 'active').map(s => s.book_id);

  // Merge user's personal reading books + active club books
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
      <div className="px-4 pt-6 pb-24 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBook && userReadingBooks.length === 0) {
    return (
      <div className="px-4 pt-6 pb-24 animate-fade-in">
        <div className="mb-6"><QuoteOfTheDay /></div>
        <div className="mb-6">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Şu Anda Okunan</p>
          <h1 className="text-2xl font-serif font-bold text-foreground mt-1">Kitap Seçilmedi</h1>
        </div>
        <div className="bg-card rounded-2xl p-8 shadow-card text-center border border-border/50">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm leading-relaxed">
            Şu an okuduğunuz bir kitap görünmüyor.<br />Kütüphanenizden yeni bir yolculuğa başlayabilirsiniz.
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

      // Sync with library list
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
    <div className="px-4 pt-6 pb-24 animate-fade-in max-w-lg mx-auto">
      <div className="mb-8"><QuoteOfTheDay /></div>

      <DailyCheckIns />
      <ClubProgress />

      {/* Header */}
      <div className="mb-6 text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2">Şu Anda Okunan</p>
        <button
          onClick={() => navigate(`/book/${displayBook.id}`)}
          className="flex items-center justify-center gap-2 group mx-auto"
        >
          <h1 className="text-2xl font-serif font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{displayBook.title}</h1>
          {isClubBook && (
            <span title="Kulüp Ortak Kitabı">
              <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
            </span>
          )}
        </button>
        <p className="text-muted-foreground mt-1 text-sm">{displayBook.author}</p>
      </div>

      {/* Book Selection (if multiple) */}
      {userReadingBooks.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 justify-center">
          {userReadingBooks.map(book => (
            <button
              key={book.id}
              onClick={() => setSelectedBookId(book.id)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1',
                (selectedBookId === book.id || (!selectedBookId && book.id === userReadingBooks[0]?.id))
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'bg-transparent border border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {book.title}
            </button>
          ))}
        </div>
      )}

      {/* Book Cover Container */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => navigate(`/book/${displayBook.id}`)}
          className="w-40 rounded-xl overflow-hidden shadow-card transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <img
            src={displayBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
            alt={displayBook.title}
            className="w-full h-auto object-cover aspect-[2/3]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop';
            }}
          />
        </button>
      </div>

      {/* Mindful Progress Card */}
      <div className="mb-8">
        <MindfulProgressCard
          bookTitle={displayBook.title}
          bookCover={displayBook.cover_url}
          currentPage={userCurrentPage}
          totalPages={totalPages}
        />
      </div>

      {/* Update Progress Area */}
      <div className="bg-card rounded-3xl p-6 shadow-soft border border-border/40 mb-8">
        <h3 className="font-serif font-medium text-center text-foreground mb-4 flex items-center justify-center gap-2">
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
            className="flex-1 h-12 text-center bg-transparent border-border rounded-xl focus-visible:ring-forest"
          />
          <Button
            onClick={handleUpdateProgress}
            className="h-12 px-8 rounded-xl font-medium bg-forest hover:bg-forest-light text-primary-foreground shadow-soft"
            disabled={upsertProgress.isPending}
          >
            {upsertProgress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
          </Button>
        </div>

        {/* Stop reading option */}
        {userProgress && (
          <div className="mt-4 text-center">
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={async () => {
                if (!user) return;
                try {
                  await deleteProgress.mutateAsync({
                    user_id: user.id,
                    book_id: displayBook.id,
                  });
                  // Automatically move to DNF list
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

      {/* Zen Focus Mode link */}
      <div className="text-center pb-2">
        <button
          onClick={() => setIsZenMode(true)}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-300 tracking-widest font-serif"
        >
          ✦ Odak Moduna Gir
        </button>
      </div>

      {/* ZenReadingSession overlay */}
      {isZenMode && <ZenReadingSession onClose={() => setIsZenMode(false)} />}

    </div>
  );
};

export default CurrentReadTab;
