import { Star } from 'lucide-react';
import { useBookReviews } from '@/hooks/useBookReviews';

interface RatingBreakdownChartProps {
    bookId: string;
    averageRating?: number;
    ratingCount?: number;
}

const RatingBreakdownChart = ({ bookId, averageRating, ratingCount }: RatingBreakdownChartProps) => {
    const { data: reviews = [] } = useBookReviews(bookId);

    if (reviews.length === 0) return null;

    // Count by rating (1-10 grouped to 1-5 for display)
    const bins = [
        { label: '9-10', count: reviews.filter(r => r.rating >= 9).length },
        { label: '7-8', count: reviews.filter(r => r.rating >= 7 && r.rating <= 8).length },
        { label: '5-6', count: reviews.filter(r => r.rating >= 5 && r.rating <= 6).length },
        { label: '3-4', count: reviews.filter(r => r.rating >= 3 && r.rating <= 4).length },
        { label: '1-2', count: reviews.filter(r => r.rating <= 2).length },
    ];
    const max = Math.max(...bins.map(b => b.count), 1);

    return (
        <div className="mt-4 mb-2 p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-bold">{averageRating?.toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">{ratingCount} değerlendirme</span>
            </div>
            <div className="space-y-1.5">
                {bins.map(bin => (
                    <div key={bin.label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-9 text-right">{bin.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                                style={{ width: `${(bin.count / max) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground w-4">{bin.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RatingBreakdownChart;
