import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const BookCard = ({ book, size = 'md', showOwner = false, ownerName, isClubBook = false, className }: BookCardProps) => {
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
      className={cn('flex flex-col text-left hover:opacity-90 transition-opacity', className)}
    >
      <div
        className={cn(
          'relative rounded-lg overflow-hidden shadow-card bg-muted border-2 border-border',
          sizes[size]
        )}
      >
        <img
          src={book.cover_url}
          alt={book.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop';
          }}
        />
        {isClubBook && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white p-1 rounded-md shadow-sm backdrop-blur-md bg-opacity-90">
            <Crown className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <h4
          className={cn(
            'font-serif font-semibold text-foreground line-clamp-2',
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
};

export default BookCard;
