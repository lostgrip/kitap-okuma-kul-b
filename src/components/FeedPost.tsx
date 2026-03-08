import { useState, memo } from 'react';
import { Quote, MessageCircle, Heart, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Avatar from './Avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLikePost, useUnlikePost, useDeleteFeedPost } from '@/hooks/useFeedPosts';

interface FeedPostData {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  page_reference: number | null;
  type: 'update' | 'quote' | 'review' | 'milestone' | 'poll' | 'recommendation';
  created_at: string;
  image_url?: string | null;
  userName?: string;
  userAvatar?: string;
  bookTitle?: string;
  feed_post_likes?: { user_id: string }[];
}

interface FeedPostProps {
  post: FeedPostData;
  userCurrentPage: number;
}

const FeedPost = memo(({ post, userCurrentPage }: FeedPostProps) => {
  const { user } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);

  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const deleteMutation = useDeleteFeedPost();

  const isLiked = post.feed_post_likes?.some(like => like.user_id === user?.id) || false;
  const likeCount = post.feed_post_likes?.length || 0;

  const isSpoiler = post.page_reference !== null && post.page_reference > userCurrentPage;
  const showBlur = isSpoiler && !isRevealed;

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr });
  const isCurrentUser = post.user_id === user?.id;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
          name={post.userName || 'Kullanıcı'}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {isCurrentUser ? 'Sen' : post.userName || 'Anonim'}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
        {post.type === 'quote' && (
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Quote className="w-4 h-4 text-primary" />
          </div>
        )}
        {isCurrentUser && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate(post.id)}
            disabled={deleteMutation.isPending}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Spoiler Warning */}
      {isSpoiler && !isRevealed && (
        <div className="bg-muted rounded-xl p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Sayfa {post.page_reference}'den içerik</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsRevealed(true)} className="text-xs font-medium text-primary hover:text-primary">
            <Eye className="w-3 h-3 mr-1" />
            Göster
          </Button>
        </div>
      )}

      {/* Content */}
      <div className={cn('relative transition-all duration-300', showBlur && 'spoiler-blur select-none')}>
        {post.type === 'quote' ? (
          <blockquote className="text-foreground italic border-l-4 border-primary pl-4 py-2">
            "{post.content}"
          </blockquote>
        ) : (
          <p className="text-foreground leading-relaxed">{post.content}</p>
        )}
      </div>

      {/* Post Image */}
      {post.image_url && (
        <div className="mt-3 rounded-xl overflow-hidden border-2 border-border">
          <img src={post.image_url} alt="Gönderi görseli" className="w-full max-h-80 object-cover" />
        </div>
      )}

      {/* Book Reference */}
      {post.bookTitle && (
        <p className="text-xs text-muted-foreground mt-3">📖 {post.bookTitle}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <button
          onClick={() => {
            if (!user) return;
            if (isLiked) {
              unlikeMutation.mutate({ postId: post.id, userId: user.id });
            } else {
              likeMutation.mutate({ postId: post.id, userId: user.id });
            }
          }}
          disabled={likeMutation.isPending || unlikeMutation.isPending}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            isLiked ? 'text-terracotta' : 'text-muted-foreground hover:text-terracotta'
          )}
        >
          <Heart className={cn('w-4 h-4', isLiked && 'fill-current')} />
          <span>{likeCount > 0 ? likeCount : 'Beğen'}</span>
        </button>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span>Yorum</span>
        </button>
      </div>
    </div>
  );
});

FeedPost.displayName = 'FeedPost';

export default FeedPost;
