import { useState } from 'react';
import { Target, TrendingUp, Flame, BookOpen, Loader2, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProgressBar from './ProgressBar';
import Avatar from './Avatar';
import QuoteOfTheDay from './QuoteOfTheDay';
import GoalProgressCard from './GoalProgressCard';
import ClubScheduleCard from './ClubScheduleCard';
import { useBooks, useSetClubGoal, useRemoveClubGoal } from '@/hooks/useBooks';
import { useAllProgress, useUpsertProgress, useDeleteProgress } from '@/hooks/useProgress';
import { useProfiles } from '@/hooks/useProfiles';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useReadingLog } from '@/hooks/useReadingLog';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// We'll use a simple approach: "club book" = a book set by admin via reading_progress with a special marker
// For now, we use a local state approach with the first book as club book if admin selected it

const CurrentReadTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const { data: allProgress = [], isLoading: progressLoading } = useAllProgress();
  const { data: profiles = [] } = useProfiles();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: goals = [] } = useGoals(user?.id);
  const { data: logs = [] } = useReadingLog(user?.id || '');
  const { data: schedule = [] } = useClubSchedule();
  const upsertProgress = useUpsertProgress();
  const deleteProgress = useDeleteProgress();
  const setClubGoal = useSetClubGoal();
  const removeClubGoal = useRemoveClubGoal();

  const [inputPage, setInputPage] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isSettingClubGoal, setIsSettingClubGoal] = useState(false);
  const [clubBookId, setClubBookId] = useState<string>('');

  // Get user's own reading books (books where user has progress with status 'reading')
  const userReadingProgress = allProgress.filter(
    p => p.user_id === user?.id && p.status === 'reading'
  );
  const userReadingBookIds = userReadingProgress.map(p => p.book_id);
  const userReadingBooks = books.filter(b => userReadingBookIds.includes(b.id));

  const clubBook = books.find(b => b.club_status === 'active_goal') || null;

  const currentBook = selectedBookId
    ? books.find(b => b.id === selectedBookId)
    : userReadingBooks[0] || clubBook;

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
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Kütüphaneden bir kitabı "Okuyorum" listesine ekleyin!
          </p>
        </div>

        {/* Admin: Set Club Goal */}
        {isAdmin && books.length > 0 && (
          <div className="mt-6 bg-card rounded-2xl p-5 shadow-card">
            <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Kulüp Hedefi Belirle
            </h3>
            <p className="text-sm text-muted-foreground mb-3">Kulüp için okunan kitabı belirleyin</p>
            <Select value={clubBookId} onValueChange={setClubBookId}>
              <SelectTrigger className="h-12 bg-muted border-0 rounded-xl mb-3">
                <SelectValue placeholder="Kitap seçin" />
              </SelectTrigger>
              <SelectContent>
                {books.map(book => (
                  <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                if (!clubBookId) return;
                try {
                  await setClubGoal.mutateAsync(clubBookId);
                  toast.success('Kulüp hedefi belirlendi!');
                  setClubBookId('');
                } catch {
                  toast.error('Hata oluştu');
                }
              }}
              className="w-full h-12 rounded-xl"
              disabled={!clubBookId || setClubGoal.isPending}
            >
              Kulüp Hedefi Olarak Belirle
            </Button>
            {clubBook && (
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await removeClubGoal.mutateAsync(clubBook.id);
                    toast.success('Kulüp hedefi kaldırıldı');
                  } catch {
                    toast.error('Hata oluştu');
                  }
                }}
                className="w-full h-12 rounded-xl mt-3"
                disabled={removeClubGoal.isPending}
              >
                Kulüp Hedefini Kaldır
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  const displayBook = currentBook || userReadingBooks[0];
  if (!displayBook) return null;

  const totalPages = displayBook.page_count;
  const weeklyGoal = 75;
  const pagesToGoal = Math.max(0, weeklyGoal - (userCurrentPage % weeklyGoal));

  const isClubBook = clubBook?.id === displayBook.id;

  // Get progress for current book
  const bookProgress = allProgress
    .filter(p => p.book_id === displayBook.id)
    .sort((a, b) => b.current_page - a.current_page)
    .slice(0, 5);

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

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
      await upsertProgress.mutateAsync({
        user_id: user.id,
        book_id: displayBook.id,
        current_page: newPage,
        status: (totalPages > 0 && newPage >= totalPages) ? 'completed' : 'reading',
      });
      setInputPage('');
      toast.success('İlerleme kaydedildi!');
    } catch {
      toast.error('İlerleme kaydedilirken hata oluştu');
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <div className="mb-6"><QuoteOfTheDay /></div>

      {/* Goal progress + streak */}
      {user && (
        <GoalProgressCard
          logs={logs}
          goals={goals}
          totalPagesThisWeek={logs
            .filter(l => {
              const d = new Date(l.logged_at);
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
              return d >= weekAgo;
            })
            .reduce((sum, l) => sum + l.pages_read, 0)}
          completedBooksThisMonth={allProgress.filter(p => {
            if (p.user_id !== user?.id || p.status !== 'completed' || !p.completed_at) return false;
            const d = new Date(p.completed_at);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length}
        />
      )}

      {/* Club reading schedule */}
      {schedule.length > 0 && <ClubScheduleCard schedule={schedule} books={books} />}

      {/* Header with badge */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Şu Anda Okunan</p>
          {isClubBook && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Users className="w-3 h-3" />
              Kulüp
            </span>
          )}
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mt-1">{displayBook.title}</h1>
        <p className="text-muted-foreground">{displayBook.author}</p>
      </div>

      {/* Book Selection */}
      {userReadingBooks.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {userReadingBooks.map(book => (
            <button
              key={book.id}
              onClick={() => setSelectedBookId(book.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1',
                (selectedBookId === book.id || (!selectedBookId && book.id === userReadingBooks[0]?.id))
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {clubBook?.id === book.id && <Users className="w-3 h-3" />}
              {book.title}
            </button>
          ))}
        </div>
      )}

      {/* Book Cover & Progress Card */}
      <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
        <div className="flex gap-5">
          <div className="w-28 h-40 rounded-xl overflow-hidden shadow-elevated flex-shrink-0">
            <img
              src={displayBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
              alt={displayBook.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-terracotta" />
                <span className="text-sm font-medium text-terracotta">
                  {displayBook.genre || 'Okumaya devam'}
                </span>
              </div>
              <ProgressBar current={userCurrentPage} total={totalPages} size="lg" />
            </div>
            <div className="flex items-center gap-2 mt-4 p-3 bg-accent/50 rounded-xl">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">
                <strong>{pagesToGoal}</strong> sayfa haftalık hedefe
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin: Set Club Goal */}
      {isAdmin && (
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
          <button
            onClick={() => setIsSettingClubGoal(!isSettingClubGoal)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-serif font-semibold text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Kulüp Hedefi Belirle
            </h3>
            <span className="text-xs text-muted-foreground">{isSettingClubGoal ? 'Kapat' : 'Aç'}</span>
          </button>
          {isSettingClubGoal && (
            <div className="mt-4 space-y-3">
              <Select value={clubBookId} onValueChange={setClubBookId}>
                <SelectTrigger className="h-12 bg-muted border-0 rounded-xl">
                  <SelectValue placeholder="Kulüp kitabı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {books.map(book => (
                    <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={async () => {
                  if (!clubBookId) return;
                  try {
                    await setClubGoal.mutateAsync(clubBookId);
                    toast.success('Kulüp hedefi belirlendi!');
                    setClubBookId('');
                    setIsSettingClubGoal(false);
                  } catch {
                    toast.error('Hata oluştu');
                  }
                }}
                className="w-full h-12 rounded-xl"
                disabled={!clubBookId || setClubGoal.isPending}
              >
                Kulüp Hedefi Olarak Belirle
              </Button>
              {clubBook && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await removeClubGoal.mutateAsync(clubBook.id);
                      toast.success('Kulüp hedefi kaldırıldı');
                      setIsSettingClubGoal(false);
                    } catch {
                      toast.error('Hata oluştu');
                    }
                  }}
                  className="w-full h-12 rounded-xl"
                  disabled={removeClubGoal.isPending}
                >
                  Kulüp Hedefini Kaldır
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Update Progress */}
      <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
        <h3 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          İlerlemenizi Güncelleyin
        </h3>
        <div className="flex gap-3 mt-4">
          <Input
            type="number"
            placeholder="Mevcut sayfa..."
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            min={1}
            className="flex-1 h-12 text-base bg-muted border-0 rounded-xl"
          />
          <Button
            onClick={handleUpdateProgress}
            className="h-12 px-6 rounded-xl font-semibold"
            disabled={upsertProgress.isPending}
          >
            {upsertProgress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
          </Button>
        </div>

        {/* Stop reading book option */}
        {(userProgress || isClubBook) && (
          <div className="mt-4 pt-4 border-t border-border flex justify-end">
            <Button
              variant="outline"
              className="text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={async () => {
                if (!user) return;
                try {
                  await deleteProgress.mutateAsync({
                    user_id: user.id,
                    book_id: displayBook.id,
                  });
                  toast.success('Kitap okuma listesinden çıkarıldı!');
                  if (selectedBookId === displayBook.id) {
                    setSelectedBookId(null);
                  }
                } catch {
                  toast.error('Hata oluştu');
                }
              }}
              disabled={deleteProgress.isPending}
            >
              Okumayı Bırak
            </Button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-card rounded-2xl p-5 shadow-card">
        <h3 className="font-serif font-semibold text-lg mb-4">Kulüp İlerlemesi</h3>
        {bookProgress.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Henüz kimse okumaya başlamadı</p>
        ) : (
          <div className="space-y-4">
            {bookProgress.map((progress, index) => {
              const profile = getProfile(progress.user_id);
              if (!profile) return null;

              const percentage = totalPages > 0 ? Math.round((progress.current_page / totalPages) * 100) : 0;
              const isCurrentUser = progress.user_id === user?.id;

              return (
                <div key={progress.id} className={cn('flex items-center gap-3 p-3 rounded-xl transition-colors', isCurrentUser && 'bg-accent/50')}>
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    index === 0 && 'bg-amber text-foreground',
                    index === 1 && 'bg-muted text-muted-foreground',
                    index === 2 && 'bg-terracotta/30 text-terracotta',
                    index > 2 && 'bg-muted text-muted-foreground'
                  )}>
                    {index + 1}
                  </span>
                  <Avatar
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                    name={profile.display_name || profile.username}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {isCurrentUser ? 'Sen' : profile.display_name || profile.username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentReadTab;
