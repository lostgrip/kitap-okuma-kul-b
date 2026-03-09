import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOptimizedCoverUrl } from '@/lib/imageUtils';

interface BookCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string;
    total_pages?: number;
    owner_id?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showOwner?: boolean;
  ownerName?: string;
  isClubBook?: boolean;
  className?: string;
}

const COVER_WIDTHS: Record<string, number> = { sm: 120, md: 200, lg: 280 };

const BookCard = memo(({ book, size = 'md', showOwner = false, ownerName, isClubBook = false, className }: BookCardProps) => {
  const navigate = useNavigate();

  const sizes = {
    sm: 'w-16 h-24',
    md: 'w-24 h-36',
    lg: 'w-32 h-48',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <button
      onClick={() => navigate(`/book/${book.id}`)}
      className={cn(
        'flex flex-col text-left group transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]',
        className
      )}
    >
      <div
        className={cn(
          'relative rounded-xl overflow-hidden shadow-card bg-muted',
          'transition-shadow duration-300 group-hover:shadow-elevated',
          sizes[size]
        )}
      >
        <img
          src={getOptimizedCoverUrl(book.cover_url, { width: COVER_WIDTHS[size] })}
          alt={book.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getOptimizedCoverUrl(null);
          }}
        />
        {isClubBook && (
          <div className="absolute top-1.5 left-1.5 bg-amber/90 text-foreground p-1 rounded-md shadow-sm backdrop-blur-sm">
            <Crown className="w-3 h-3" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h4
          className={cn(
            'font-serif font-semibold text-foreground line-clamp-2 leading-snug',
            textSizes[size]
          )}
        >
          {book.title}
        </h4>
        <p
          className={cn(
            'text-muted-foreground mt-0.5',
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}
        >
          {book.author}
        </p>
        {showOwner && ownerName && (
          <p className="text-xs text-terracotta mt-1 font-medium">
            {ownerName}
          </p>
        )}
      </div>
    </button>
  );
});

BookCard.displayName = 'BookCard';

export default BookCard;
