import { useState } from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, Loader2, Crown, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookVotes, useAddBookVote, useRemoveBookVote } from '@/hooks/useBookVotes';
import { useBooks } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAddClubSchedule } from '@/hooks/useClubSchedule';
import { toast } from 'sonner';

const BookVotingSection = () => {
    const { user } = useAuth();
    const { data: votes = [] } = useBookVotes();
    const { data: books = [] } = useBooks();
    const { data: profiles = [] } = useProfiles();
    const { data: isAdmin } = useIsAdmin(user?.id);
    const addVote = useAddBookVote();
    const removeVote = useRemoveBookVote();
    const addClubSchedule = useAddClubSchedule();

    const userProfile = profiles.find(p => p.user_id === user?.id);

    // Get books that haven't been read yet (no active_goal / approved) — eligible for voting
    const eligibleBooks = books.filter(b => b.club_status !== 'active_goal');

    // Tally votes per book
    const voteTally = eligibleBooks
        .map(book => ({
            book,
            count: votes.filter(v => v.book_id === book.id).length,
            hasVoted: votes.some(v => v.book_id === book.id && v.user_id === user?.id),
        }))
        .filter(t => t.count > 0 || true)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

    const handleVote = async (bookId: string, hasVoted: boolean) => {
        if (!user) {
            toast.error('Oy kullanmak için giriş yapmalısınız');
            return;
        }

        // Define an effective group code. If regular user doesn't have one, fallback to 'ZENHUBE', though users without groups shouldn't vote in a multi-tenant app.
        // For Zen App, we treat everyone essentially as general members if no group is strictly enforced.
        const effectiveGroupCode = userProfile?.group_code || 'ZENHUB';

        try {
            if (hasVoted) {
                await removeVote.mutateAsync({ book_id: bookId, user_id: user.id });
                toast.success('Oyunuz kaldırıldı');
            } else {
                await addVote.mutateAsync({
                    book_id: bookId,
                    user_id: user.id,
                    group_code: effectiveGroupCode,
                });
                toast.success('Oy kullanıldı!');
            }
        } catch {
            toast.error('İşlem sırasında hata oluştu');
        }
    };

    const handleMakeClubBook = async (bookId: string) => {
        if (!user) return;
        const effectiveGroupCode = userProfile?.group_code || 'ZENHUB';
        try {
            await addClubSchedule.mutateAsync({
                book_id: bookId,
                group_code: effectiveGroupCode,
                start_date: new Date().toISOString().split('T')[0],
                end_date: null,
                status: 'active',
                notes: 'Anket sonucunda kulüp kitabı olarak seçildi.',
                created_by: user.id
            });
            toast.success('Kitap, Kulüp Ortak Kitabı olarak ayarlandı! 🌱');
        } catch {
            toast.error('Kulüp kitabı ayarlanırken hata oluştu');
        }
    };

    return (
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
            <h3 className="font-serif font-semibold text-base mb-1 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Sıradaki Kulüp Kitabı
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
                Okunmasını istediğiniz kitaba oy verin — admin seçimi yapar
            </p>

            <div className="space-y-2">
                {voteTally.map(({ book, count, hasVoted }) => (
                    <div key={book.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <div className="w-8 h-11 rounded-md overflow-hidden flex-shrink-0">
                            <img
                                src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60&h=90&fit=crop'}
                                alt={book.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{book.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary min-w-6 text-center">{count}</span>
                            <button
                                onClick={() => handleVote(book.id, hasVoted)}
                                disabled={addVote.isPending || removeVote.isPending}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${hasVoted
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                                    }`}
                            >
                                {hasVoted ? <ThumbsDown className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
                            </button>
                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleMakeClubBook(book.id)}
                                    disabled={addClubSchedule.isPending}
                                    className="w-8 h-8 rounded-lg ml-1 hover:bg-forest hover:text-white hover:border-forest"
                                    title="Kulüp Kitabı Yap"
                                >
                                    <Trophy className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                {eligibleBooks.length === 0 && (
                    <div className="text-center py-6">
                        <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Kütüphanede oy verilecek kitap yok</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookVotingSection;
