import { Calendar, Clock, BookOpen } from 'lucide-react';
import { ClubScheduleItem } from '@/hooks/useClubSchedule';
import { Book } from '@/hooks/useBooks';
import { cn } from '@/lib/utils';

interface ClubScheduleCardProps {
    schedule: ClubScheduleItem[];
    books: Book[];
}

const ClubScheduleCard = ({ schedule, books }: ClubScheduleCardProps) => {
    const active = schedule.find(s => s.status === 'active');
    const upcoming = schedule.filter(s => s.status === 'upcoming').slice(0, 2);
    const finished = schedule.filter(s => s.status === 'finished').slice(0, 3);

    if (schedule.length === 0) return null;

    const getBook = (bookId: string) => books.find(b => b.id === bookId);

    const getDaysLeft = (endDate: string | null) => {
        if (!endDate) return null;
        const diff = new Date(endDate).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="bg-card rounded-xl p-5 shadow-card mb-6">
            <h3 className="font-serif font-semibold text-base mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Kulüp Takvimi
            </h3>

            {/* Active */}
            {active && (() => {
                const book = getBook(active.book_id);
                const daysLeft = getDaysLeft(active.end_date);
                return (
                    <div className="mb-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-2">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            Bu Ay Okunuyor
                        </div>
                        <div className="flex gap-3">
                            {book?.cover_url && (
                                <img src={book.cover_url} alt={book?.title} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
                            )}
                            <div>
                                <p className="font-semibold text-sm">{book?.title}</p>
                                <p className="text-xs text-muted-foreground">{book?.author}</p>
                                {daysLeft !== null && (
                                    <div className="flex items-center gap-1 mt-1.5 text-xs">
                                        <Clock className="w-3 h-3 text-amber-500" />
                                        <span className={cn('font-medium', daysLeft <= 7 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400')}>
                                            {daysLeft} gün kaldı
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Sıradaki</p>
                    <div className="space-y-2">
                        {upcoming.map(s => {
                            const book = getBook(s.book_id);
                            return (
                                <div key={s.id} className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
                                    <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{book?.title}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(s.start_date).toLocaleDateString('tr-TR', { month: 'long', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Finished archive */}
            {finished.length > 0 && (
                <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Tamamlananlar</p>
                    <div className="flex gap-2 flex-wrap">
                        {finished.map(s => {
                            const book = getBook(s.book_id);
                            return (
                                <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg text-xs text-muted-foreground">
                                    <span>✓</span>
                                    <span className="truncate max-w-24">{book?.title}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClubScheduleCard;
