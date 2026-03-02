import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Target, TrendingUp, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserProgress } from '@/hooks/useProgress';
import { useBooks } from '@/hooks/useBooks';
import { useBookReviews } from '@/hooks/useBookReviews';
import { useReadingLog, computeStreak } from '@/hooks/useReadingLog';
import ReadingJournal from '@/components/ReadingJournal';

const MemberProfile = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();

    const { data: profiles = [] } = useProfiles();
    const { data: progress = [], isLoading: progressLoading } = useUserProgress(userId || '');
    const { data: books = [] } = useBooks();
    const { data: logs = [] } = useReadingLog(userId || '');

    const profile = profiles.find(p => p.user_id === userId);

    const completedBooks = progress.filter(p => p.status === 'completed');
    const readingBooks = progress.filter(p => p.status === 'reading');
    const totalPages = progress.reduce((sum, p) => sum + p.current_page, 0);
    const streak = computeStreak(logs);

    const getBook = (bookId: string) => books.find(b => b.id === bookId);

    if (progressLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-background p-4">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                </Button>
                <p className="text-muted-foreground text-center mt-16">Kullanıcı bulunamadı</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-serif font-semibold">Profil</h1>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
                {/* Profile card */}
                <div className="bg-card rounded-2xl p-6 border border-border">
                    <div className="flex items-center gap-4 mb-4">
                        <Avatar
                            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                            name={profile.display_name || profile.username}
                            size="lg"
                        />
                        <div>
                            <h2 className="text-xl font-serif font-semibold">{profile.display_name || profile.username}</h2>
                            <p className="text-muted-foreground text-sm">@{profile.username}</p>
                            {profile.is_admin && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full mt-1">Yönetici</span>
                            )}
                        </div>
                    </div>

                    {(profile as any).bio && (
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{(profile as any).bio}</p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                            <BookOpen className="h-4 w-4 mx-auto mb-1 text-primary" />
                            <p className="text-xl font-bold">{readingBooks.length}</p>
                            <p className="text-xs text-muted-foreground">Okuyor</p>
                        </div>
                        <div className="text-center">
                            <Target className="h-4 w-4 mx-auto mb-1 text-green-600" />
                            <p className="text-xl font-bold">{completedBooks.length}</p>
                            <p className="text-xs text-muted-foreground">Tamamladı</p>
                        </div>
                        <div className="text-center">
                            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                            <p className="text-xl font-bold">{totalPages.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Sayfa</p>
                        </div>
                        <div className="text-center">
                            <Star className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                            <p className="text-xl font-bold">{streak}</p>
                            <p className="text-xs text-muted-foreground">Streak</p>
                        </div>
                    </div>
                </div>

                {/* Reading journal */}
                {logs.length > 0 && <ReadingJournal logs={logs} />}

                {/* Currently reading */}
                {readingBooks.length > 0 && (
                    <div className="bg-card rounded-2xl p-5 border border-border">
                        <h3 className="font-serif font-semibold mb-3">Şu An Okuyor</h3>
                        <div className="space-y-3">
                            {readingBooks.map(p => {
                                const book = getBook(p.book_id);
                                if (!book) return null;
                                const pct = book.page_count > 0 ? Math.round((p.current_page / book.page_count) * 100) : 0;
                                return (
                                    <div key={p.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/book/${book.id}`)}>
                                        <img
                                            src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60&h=90&fit=crop'}
                                            alt={book.title}
                                            className="w-10 h-14 object-cover rounded-lg"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{book.title}</p>
                                            <p className="text-xs text-muted-foreground">{book.author}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground">{pct}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Completed books */}
                {completedBooks.length > 0 && (
                    <div className="bg-card rounded-2xl p-5 border border-border">
                        <h3 className="font-serif font-semibold mb-3">Tamamlananlar ({completedBooks.length})</h3>
                        <div className="flex gap-2 flex-wrap">
                            {completedBooks.slice(0, 12).map(p => {
                                const book = getBook(p.book_id);
                                if (!book) return null;
                                return (
                                    <img
                                        key={p.id}
                                        src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=60&h=90&fit=crop'}
                                        alt={book.title}
                                        className="w-10 h-14 object-cover rounded-md cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => navigate(`/book/${book.id}`)}
                                        title={book.title}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberProfile;
