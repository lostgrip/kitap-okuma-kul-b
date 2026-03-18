import { useState, memo, ElementType } from 'react';
import { Quote, MessageCircle, Heart, Eye, EyeOff, Trash2, Send, BookOpen, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Avatar from './Avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLikePost, useUnlikePost, useDeleteFeedPost, usePollVotes, useVotePoll } from '@/hooks/useFeedPosts';
import { useBookDiscussions, useAddDiscussion, useDeleteDiscussion } from '@/hooks/useDiscussions';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';

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

// ─── Poll Parser ─────────────────────────────────────────────────────────────
function parsePollContent(content: string): { question: string; options: string[] } {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const question = lines[0]?.replace(/^📊\s*ANKET:\s*/, '') || lines[0] || '';
  const options = lines.slice(1).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return { question, options };
}

// ─── Poll Section ─────────────────────────────────────────────────────────────
const PollContent = ({ post }: { post: FeedPostData }) => {
  const { user } = useAuth();
  const { question, options } = parsePollContent(post.content);
  const { data: votes = [] } = usePollVotes(post.id);
  const votePoll = useVotePoll();

  const myVote = votes.find(v => v.user_id === user?.id);
  const totalVotes = votes.length;

  const optionCounts = options.map((_, i) => votes.filter(v => v.option_index === i).length);

  const handleVote = async (idx: number) => {
    if (!user) { toast.error('Oy kullanmak için giriş yapın'); return; }
    try {
      await votePoll.mutateAsync({ postId: post.id, userId: user.id, optionIndex: idx });
    } catch {
      toast.error('Oy kullanılırken hata oluştu');
    }
  };

  return (
    <div>
      <p className="font-medium text-[15px] mb-3">{question}</p>
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const count = optionCounts[idx];
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote?.option_index === idx;
          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={votePoll.isPending}
              aria-label={`${opt} seçeneğine oy ver, ${pct}%`}
              className={cn(
                'relative w-full text-left rounded-xl overflow-hidden border transition-all duration-200',
                isMyVote
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-primary/40 hover:bg-muted/40'
              )}
            >
              {/* Progress bar background */}
              <div
                className={cn(
                  'absolute inset-0 origin-left transition-transform duration-500',
                  isMyVote ? 'bg-primary/15' : 'bg-muted/60'
                )}
                style={{ transform: `scaleX(${pct / 100})` }}
              />
              <div className="relative flex items-center justify-between px-4 py-2.5">
                <span className={cn('text-sm font-medium', isMyVote && 'text-primary')}>
                  {opt}
                  {isMyVote && <span className="ml-1.5 text-xs opacity-70">✓ Seçtiğiniz</span>}
                </span>
                <span className="text-xs text-muted-foreground font-semibold ml-3 shrink-0">
                  {pct}% ({count})
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{totalVotes} oy · Seçiminizi değiştirmek için tekrar tıklayın</p>
    </div>
  );
};

// ─── Comment Section ──────────────────────────────────────────────────────────
const CommentSection = ({ post }: { post: FeedPostData }) => {
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: discussions = [], isLoading } = useBookDiscussions(post.book_id || '');
  const addDiscussion = useAddDiscussion();
  const deleteDiscussion = useDeleteDiscussion();

  const [commentText, setCommentText] = useState('');

  const handleSubmit = async () => {
    if (!user || !commentText.trim()) return;
    try {
      await addDiscussion.mutateAsync({
        book_id: post.book_id!,
        user_id: user.id,
        content: commentText.trim(),
        parent_id: null,
        has_spoiler: false,
        page_reference: null,
        post_owner_id: post.user_id,
      });
      setCommentText('');
      toast.success('Yorum eklendi');
    } catch {
      toast.error('Yorum eklenirken hata oluştu');
    }
  };

  if (!post.book_id) {
    return (
      <div className="mt-3 pt-3 border-t border-border/40">
        <p className="text-xs text-muted-foreground text-center py-2">
          💬 Yorum yapabilmek için gönderi bir kitap ile ilişkilendirilmiş olmalı
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
      {/* Yorum Listesi */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : discussions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Henüz yorum yok. İlk yorumu siz yapın!</p>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {discussions.map(d => {
            const profile = profiles.find(p => p.user_id === d.user_id);
            const isOwn = d.user_id === user?.id;
            return (
              <div key={d.id} className="flex gap-2">
                <Avatar
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
                  name={profile?.display_name || profile?.username || 'U'}
                  size="sm"
                />
                <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold">
                      {isOwn ? 'Sen' : profile?.display_name || profile?.username || 'Anonim'}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: tr })}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-1 mt-0.5">
                    <p className="text-sm text-foreground/90 leading-snug">{d.content}</p>
                    {isOwn && (
                      <button
                        onClick={() => deleteDiscussion.mutate({ id: d.id, book_id: d.book_id })}
                        disabled={deleteDiscussion.isPending}
                        aria-label="Yorumu sil"
                        className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 mt-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Yeni Yorum */}
      {user && (
        <div className="flex gap-2 items-end">
          <Avatar
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
            name="Siz"
            size="sm"
          />
          <div className="flex-1 relative">
            <Textarea
              placeholder="Yorum yaz..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              rows={1}
              className="resize-none bg-muted/50 border-0 rounded-xl text-sm pr-10 min-h-0 py-2.5"
            />
            <button
              onClick={handleSubmit}
              disabled={addDiscussion.isPending || !commentText.trim()}
              aria-label="Yorum gönder"
              className="absolute right-2 bottom-2 text-primary disabled:text-muted-foreground/40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main FeedPost component ──────────────────────────────────────────────────
const FeedPost = memo(({ post, userCurrentPage }: FeedPostProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRevealed, setIsRevealed] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const deleteMutation = useDeleteFeedPost();

  const isLiked = post.feed_post_likes?.some((like: { user_id: string }) => like.user_id === user?.id) || false;
  const likeCount = post.feed_post_likes?.length || 0;

  const isSpoiler = post.page_reference !== null && post.page_reference > userCurrentPage;
  const showBlur = isSpoiler && !isRevealed;

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr });
  const isCurrentUser = post.user_id === user?.id;

  const handleLike = () => {
    if (!user) { toast.error('Beğenmek için giriş yapın'); return; }
    if (isLiked) {
      unlikeMutation.mutate({ postId: post.id, userId: user.id });
    } else {
      likeMutation.mutate({ postId: post.id, userId: user.id, postOwnerId: post.user_id });
    }
  };

  // Post type label
  const typeConfig: Record<string, { icon: ElementType; label: string; color: string }> = {
    quote: { icon: Quote, label: 'Alıntı', color: 'text-violet-500 bg-violet-500/10' },
    poll: { icon: BarChart3, label: 'Anket', color: 'text-amber-500 bg-amber-500/10' },
    recommendation: { icon: BookOpen, label: 'Öneri', color: 'text-emerald-500 bg-emerald-500/10' },
  };
  const typeInfo = typeConfig[post.type];

  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/40 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar
          src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
          name={post.userName || 'Kullanıcı'}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {isCurrentUser ? 'Sen' : post.userName || 'Anonim'}
          </p>
          <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
        </div>
        {typeInfo && (
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', typeInfo.color)}>
            <typeInfo.icon className="w-3.5 h-3.5" />
            {typeInfo.label}
          </div>
        )}
        {isCurrentUser && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate(post.id)}
            disabled={deleteMutation.isPending}
            aria-label="Gönderiyi sil"
            className="w-9 h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Spoiler Warning */}
      {isSpoiler && !isRevealed && (
        <div className="bg-muted/60 rounded-xl p-3 mb-3 flex items-center justify-between">
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
        {post.type === 'poll' ? (
          <PollContent post={post} />
        ) : post.type === 'quote' ? (
          <blockquote className="text-foreground/90 italic border-l-2 border-primary/40 pl-4 py-1 text-[15px] leading-relaxed">
            &ldquo;{post.content}&rdquo;
          </blockquote>
        ) : post.type === 'recommendation' ? (
          <div>
            <p className="text-foreground/90 leading-relaxed text-[15px] whitespace-pre-line">{post.content}</p>
            {/* Clickable book reference */}
            {post.book_id && (
              <button
                onClick={() => navigate(`/book/${post.book_id}`)}
                className="mt-3 flex items-center gap-2 group hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-lg text-primary text-xs font-medium group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  {post.bookTitle || 'Kitabı Görüntüle'} →
                </div>
              </button>
            )}
          </div>
        ) : (
          <p className="text-foreground/90 leading-relaxed text-[15px] whitespace-pre-line">{post.content}</p>
        )}
      </div>

      {/* Post Image */}
      {post.image_url && (
        <div className="mt-4 rounded-xl overflow-hidden">
          <img src={post.image_url} alt="Gönderi görseli" className="w-full max-h-80 object-cover" loading="lazy" />
        </div>
      )}

      {/* Book Reference (non-recommendation) */}
      {post.bookTitle && post.type !== 'recommendation' && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <span className="opacity-70">📖</span> {post.bookTitle}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border/40">
        <button
          onClick={handleLike}
          disabled={likeMutation.isPending || unlikeMutation.isPending}
          aria-label={isLiked ? 'Beğeniyi kaldır' : 'Beğen'}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-all duration-200',
            isLiked ? 'text-terracotta' : 'text-muted-foreground hover:text-terracotta'
          )}
        >
          <Heart className={cn('w-4 h-4 transition-transform duration-200', isLiked && 'fill-current scale-110')} />
          <span>{likeCount > 0 ? likeCount : 'Beğen'}</span>
        </button>

        <button
          onClick={() => setShowComments(v => !v)}
          aria-label={showComments ? 'Yorumları gizle' : 'Yorumları göster'}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors duration-200',
            showComments ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Yorum</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection post={post} />}
    </div>
  );
});

FeedPost.displayName = 'FeedPost';

export default FeedPost;
