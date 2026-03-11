import { cn } from '@/lib/utils';
import { ReadingLogEntry } from '@/hooks/useReadingLog';
import { BookOpen } from 'lucide-react';

interface ReadingJournalProps {
    logs: ReadingLogEntry[];
}

const ReadingJournal = ({ logs }: ReadingJournalProps) => {
    // Build a map of date -> pages read
    const today = new Date();
    const days: { date: Date; pages: number; dateStr: string }[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dateStr = d.toISOString().split('T')[0];
        const pages = logs
            .filter(l => l.logged_at.startsWith(dateStr))
            .reduce((sum, l) => sum + l.pages_read, 0);
        days.push({ date: d, pages, dateStr });
    }

    const maxPages = Math.max(...days.map(d => d.pages), 1);

    const getIntensity = (pages: number) => {
        if (pages === 0) return 'bg-muted';
        const pct = pages / maxPages;
        if (pct < 0.25) return 'bg-primary/20';
        if (pct < 0.5) return 'bg-primary/45';
        if (pct < 0.75) return 'bg-primary/70';
        return 'bg-primary';
    };

    const totalPages = logs.reduce((sum, l) => sum + l.pages_read, 0);
    const activeDays = new Set(logs.map(l => l.logged_at.split('T')[0])).size;

    return (
        <div className="bg-card rounded-xl p-5 shadow-card mb-6">
            <h3 className="font-serif font-semibold text-base mb-1 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Okuma Günlüğüm
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Son 30 gün • {totalPages} sayfa • {activeDays} aktif gün</p>

            {/* Calendar heatmap */}
            <div className="flex gap-1 flex-wrap">
                {days.map(({ dateStr, pages, date }) => (
                    <div
                        key={dateStr}
                        className={cn('w-6 h-6 rounded-sm transition-colors', getIntensity(pages))}
                        title={`${date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })}: ${pages} sayfa`}
                    />
                ))}
            </div>

            {/* Bar chart for last 7 days */}
            <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Son 7 gün</p>
                <div className="flex items-end gap-1 h-12">
                    {days.slice(-7).map(({ dateStr, pages, date }) => (
                        <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className={cn('w-full rounded-t-sm transition-all duration-500', pages > 0 ? 'bg-primary' : 'bg-muted')}
                                style={{ height: `${Math.max(2, (pages / maxPages) * 44)}px` }}
                            />
                            <span className="text-[9px] text-muted-foreground">
                                {date.toLocaleDateString('tr-TR', { weekday: 'narrow' })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReadingJournal;
