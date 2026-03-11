import { BookOpen, Star, TrendingUp, Calendar } from 'lucide-react';
import { ReadingProgress } from '@/hooks/useProgress';
import { Book } from '@/hooks/useBooks';
import { useBookReviews } from '@/hooks/useBookReviews';
import { ReadingLogEntry } from '@/hooks/useReadingLog';

interface YearInReviewProps {
    progress: ReadingProgress[];
    books: Book[];
    logs: ReadingLogEntry[];
}

const YearInReview = ({ progress, books, logs }: YearInReviewProps) => {
    const currentYear = new Date().getFullYear();

    const thisYearProgress = progress.filter(p => {
        const year = p.completed_at ? new Date(p.completed_at).getFullYear() : null;
        return year === currentYear;
    });

    const completedIds = thisYearProgress.filter(p => p.status === 'completed').map(p => p.book_id);
    const completedBooks = books.filter(b => completedIds.includes(b.id));

    const totalPages = thisYearProgress.reduce((sum, p) => sum + p.current_page, 0);
    const activeDays = new Set(
        logs
            .filter(l => new Date(l.logged_at).getFullYear() === currentYear)
            .map(l => l.logged_at.split('T')[0])
    ).size;

    // Genre breakdown
    const genreCounts: Record<string, number> = {};
    completedBooks.forEach(b => {
        if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];

    // Longest book
    const longestBook = completedBooks.reduce<Book | null>((acc, b) => {
        if (!acc || b.page_count > acc.page_count) return b;
        return acc;
    }, null);

    if (completedBooks.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20">
            <h3 className="font-serif font-semibold text-base mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                {currentYear} Yılında
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-background/60 rounded-xl p-3 text-center">
                    <BookOpen className="w-4 h-4 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{completedBooks.length}</p>
                    <p className="text-xs text-muted-foreground">Kitap</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                    <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{totalPages.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Sayfa</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                    <Calendar className="w-4 h-4 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold">{activeDays}</p>
                    <p className="text-xs text-muted-foreground">Aktif Gün</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                    <Star className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                    <p className="text-lg font-bold truncate">{topGenre?.[0] || '—'}</p>
                    <p className="text-xs text-muted-foreground">Favori Tür</p>
                </div>
            </div>

            {longestBook && (
                <div className="bg-background/60 rounded-xl p-3 flex items-center gap-3">
                    {longestBook.cover_url && (
                        <img src={longestBook.cover_url} alt={longestBook.title} className="w-8 h-12 object-cover rounded" />
                    )}
                    <div>
                        <p className="text-xs text-muted-foreground">En uzun kitap</p>
                        <p className="text-sm font-medium">{longestBook.title}</p>
                        <p className="text-xs text-muted-foreground">{longestBook.page_count} sayfa</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YearInReview;
