import { memo } from 'react';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface BookCardSkeletonProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    count?: number;
}

const COVER_WIDTHS: Record<string, string> = { sm: 'w-16 h-24', md: 'w-24 h-36', lg: 'w-32 h-48' };

export const BookCardSkeleton = memo(({ size = 'md', className }: Omit<BookCardSkeletonProps, 'count'>) => {
    return (
        <div className={cn('flex flex-col animate-pulse', className)}>
            <div
                className={cn(
                    'relative rounded-lg overflow-hidden bg-muted border-2 border-border flex items-center justify-center',
                    COVER_WIDTHS[size]
                )}
            >
                <BookOpen className="w-8 h-8 text-muted-foreground/20" />
            </div>
            <div className="mt-2 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
            </div>
        </div>
    );
});

BookCardSkeleton.displayName = 'BookCardSkeleton';

export const BookListSkeleton = memo(({ size = 'md', className, count = 4 }: BookCardSkeletonProps) => {
    return (
        <div className={cn('grid grid-cols-2 gap-4', className)}>
            {Array.from({ length: count }).map((_, i) => (
                <BookCardSkeleton key={i} size={size} />
            ))}
        </div>
    );
});

BookListSkeleton.displayName = 'BookListSkeleton';

export default BookCardSkeleton;
