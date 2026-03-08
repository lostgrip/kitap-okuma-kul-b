import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Crown, Plus, Trash2, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBookVotes, useAddBookVote, useRemoveBookVote } from '@/hooks/useBookVotes';
import { useVotingNominations, useAddNomination, useRemoveNomination } from '@/hooks/useVotingNominations';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useGoogleBooks } from '@/hooks/useGoogleBooks';
import { toast } from 'sonner';

const BookVotingSection = () => {
  const { user } = useAuth();
  const { data: votes = [] } = useBookVotes();
  const { data: nominations = [], isLoading } = useVotingNominations();
  const { data: profiles = [] } = useProfiles();
  const addVote = useAddBookVote();
  const removeVote = useRemoveBookVote();
  const addNomination = useAddNomination();
  const removeNomination = useRemoveNomination();
  const { searchBooks, results, isSearching, getCoverUrl, clearResults } = useGoogleBooks();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userProfile = profiles.find(p => p.user_id === user?.id);
  const userNomination = nominations.find(n => n.user_id === user?.id);
  const effectiveGroupCode = userProfile?.group_code || 'ZENHUB';

  // Tally votes per nomination
  const voteTally = nominations
    .map(nomination => ({
      nomination,
      count: votes.filter(v => v.book_id === nomination.id).length,
      hasVoted: votes.some(v => v.book_id === nomination.id && v.user_id === user?.id),
      nominatedBy: profiles.find(p => p.user_id === nomination.user_id),
    }))
    .sort((a, b) => b.count - a.count);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchBooks(searchQuery);
    }
  };

  const handleSelectBook = async (book: ReturnType<typeof results>[0]) => {
    if (!user) return;

    try {
      await addNomination.mutateAsync({
        user_id: user.id,
        book_title: book.volumeInfo.title,
        book_author: book.volumeInfo.authors?.join(', ') || 'Bilinmeyen',
        book_cover_url: getCoverUrl(book),
        group_code: effectiveGroupCode,
      });
      toast.success('Kitap aday gösterildi!');
      setIsDialogOpen(false);
      setSearchQuery('');
      clearResults();
    } catch {
      toast.error('Zaten bir adayınız var. Önce mevcut adayı silin.');
    }
  };

  const handleRemoveNomination = async () => {
    if (!user) return;
    try {
      await removeNomination.mutateAsync(user.id);
      toast.success('Adayınız kaldırıldı');
    } catch {
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleVote = async (nominationId: string, hasVoted: boolean) => {
    if (!user) {
      toast.error('Oy kullanmak için giriş yapmalısınız');
      return;
    }

    try {
      if (hasVoted) {
        await removeVote.mutateAsync({ book_id: nominationId, user_id: user.id });
        toast.success('Oyunuz kaldırıldı');
      } else {
        await addVote.mutateAsync({
          book_id: nominationId,
          user_id: user.id,
          group_code: effectiveGroupCode,
        });
        toast.success('Oy kullanıldı!');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-card mb-6 flex items-center justify-center min-h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-serif font-semibold text-base flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Sıradaki Kulüp Kitabı
        </h3>
        {!userNomination && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Aday Göster
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {userNomination
          ? 'Aday gösterdiğiniz kitap aşağıda. Değiştirmek için önce silin.'
          : 'Okumak istediğiniz bir kitap aday gösterin, herkes oy kullanabilir.'}
      </p>

      {/* User's own nomination banner */}
      {userNomination && (
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl mb-3 border border-primary/20">
          <div className="w-8 h-11 rounded-md overflow-hidden flex-shrink-0">
            <img
              src={userNomination.book_cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60&h=90&fit=crop'}
              alt={userNomination.book_title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{userNomination.book_title}</p>
            <p className="text-xs text-muted-foreground truncate">{userNomination.book_author}</p>
            <p className="text-xs text-primary">Sizin adayınız</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemoveNomination}
            disabled={removeNomination.isPending}
            className="text-destructive hover:bg-destructive/10"
          >
            {removeNomination.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* All nominations with votes */}
      <div className="space-y-2">
        {voteTally.map(({ nomination, count, hasVoted, nominatedBy }) => (
          <div key={nomination.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-8 h-11 rounded-md overflow-hidden flex-shrink-0">
              <img
                src={nomination.book_cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60&h=90&fit=crop'}
                alt={nomination.book_title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{nomination.book_title}</p>
              <p className="text-xs text-muted-foreground truncate">{nomination.book_author}</p>
              <p className="text-xs text-muted-foreground/70">
                {nominatedBy?.display_name || nominatedBy?.username || 'Anonim'} önerdi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary min-w-6 text-center">{count}</span>
              <button
                onClick={() => handleVote(nomination.id, hasVoted)}
                disabled={addVote.isPending || removeVote.isPending}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                  hasVoted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {hasVoted ? <ThumbsDown className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        {nominations.length === 0 && (
          <div className="text-center py-6">
            <Crown className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Henüz aday gösterilen kitap yok</p>
            <p className="text-xs text-muted-foreground mt-1">İlk adayı siz gösterin!</p>
          </div>
        )}
      </div>

      {/* Book Search Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Kitap Aday Göster</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSearch} className="flex gap-2 mt-2">
            <Input
              placeholder="Kitap adı veya yazar ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          <div className="max-h-80 overflow-y-auto space-y-2 mt-4">
            {results.length === 0 && !isSearching && searchQuery && (
              <p className="text-center text-muted-foreground text-sm py-4">Sonuç bulunamadı</p>
            )}
            {results.map((book) => (
              <button
                key={book.id}
                onClick={() => handleSelectBook(book)}
                disabled={addNomination.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
              >
                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {getCoverUrl(book) ? (
                    <img
                      src={getCoverUrl(book)!}
                      alt={book.volumeInfo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Kapak yok
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{book.volumeInfo.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {book.volumeInfo.authors?.join(', ') || 'Bilinmeyen'}
                  </p>
                  {book.volumeInfo.pageCount && (
                    <p className="text-xs text-muted-foreground/70">{book.volumeInfo.pageCount} sayfa</p>
                  )}
                </div>
                <Plus className="w-4 h-4 text-primary flex-shrink-0" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookVotingSection;
