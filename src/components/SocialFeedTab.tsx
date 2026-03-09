import { useState } from 'react';
import { Send, Quote, MessageSquare, Loader2, ImagePlus, X, BarChart3, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FeedPost from './FeedPost';
import PinnedAnnouncement from './PinnedAnnouncement';
import BookVotingSection from './BookVotingSection';
import { useFeedPosts, useAddFeedPost, FeedPost as FeedPostType } from '@/hooks/useFeedPosts';
import { useBooks } from '@/hooks/useBooks';
import { useProfiles } from '@/hooks/useProfiles';
import { useAllProgress } from '@/hooks/useProgress';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useUserBooks } from '@/hooks/useUserBooks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SocialFeedTab = () => {
  const { user } = useAuth();
  const { data: posts = [], isLoading } = useFeedPosts();
  const { data: books = [] } = useBooks();
  const { data: profiles = [] } = useProfiles();
  const { data: allProgress = [] } = useAllProgress();
  const { data: userBooks = [] } = useUserBooks(user?.id || '');
  const addFeedPost = useAddFeedPost();
  const { upload, isUploading } = useFileUpload();

  const [newPostContent, setNewPostContent] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [postType, setPostType] = useState<'update' | 'quote' | 'poll' | 'recommendation'>('update');
  const [isComposing, setIsComposing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isRecommendDialogOpen, setIsRecommendDialogOpen] = useState(false);

  const userProgress = allProgress.find(
    p => p.user_id === user?.id && p.book_id === selectedBookId
  );
  const userCurrentPage = userProgress?.current_page || 0;

  const myBookIds = userBooks.map(ub => ub.book_id);
  const myBooks = books.filter(b => myBookIds.includes(b.id));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleRecommendBook = (book: typeof books[0]) => {
    setPostType('recommendation');
    setSelectedBookId(book.id);
    setNewPostContent(`📚 "${book.title}" kitabını öneriyorum! - ${book.author}`);
    setIsRecommendDialogOpen(false);
    setIsComposing(true);
  };

  const handlePost = async () => {
    if (!user) return;

    if (postType === 'poll') {
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast.error('En az 2 seçenek girin');
        return;
      }
      const pollContent = `📊 ANKET: ${newPostContent}\n\n${validOptions.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
      try {
        await addFeedPost.mutateAsync({
          user_id: user.id,
          book_id: selectedBookId || null,
          content: pollContent,
          post_type: 'poll',
        });
        setNewPostContent('');
        setPollOptions(['', '']);
        setIsComposing(false);
        toast.success('Anket paylaşıldı!');
      } catch {
        toast.error('Anket paylaşılırken hata oluştu');
      }
      return;
    }

    if (!newPostContent.trim()) {
      toast.error('Lütfen bir içerik yazın');
      return;
    }

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const url = await upload('social-images', imageFile, user.id);
        if (url) imageUrl = url;
      }

      await addFeedPost.mutateAsync({
        user_id: user.id,
        book_id: selectedBookId || null,
        content: newPostContent,
        post_type: postType,
        image_url: imageUrl,
      });

      setNewPostContent('');
      setSelectedBookId('');
      setIsComposing(false);
      setImageFile(null);
      setImagePreview(null);
      toast.success('Gönderi paylaşıldı!');
    } catch {
      toast.error('Gönderi paylaşılırken hata oluştu');
    }
  };

  const getTransformedPost = (post: FeedPostType) => {
    const profile = profiles.find(p => p.user_id === post.user_id);
    const book = books.find(b => b.id === post.book_id);

    return {
      id: post.id,
      user_id: post.user_id,
      book_id: post.book_id || '',
      content: post.content,
      page_reference: null,
      type: post.post_type as FeedPostType['post_type'],
      created_at: post.created_at,
      image_url: post.image_url,
      userName: profile?.display_name || profile?.username || 'Anonim',
      userAvatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`,
      bookTitle: book?.title,
    };
  };

  if (isLoading) {
    return (
      <div className="px-5 pt-8 pb-24 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-24 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-xl font-serif font-bold text-foreground">Kitap Kulübü Akışı</h1>
        <p className="text-muted-foreground mt-1 text-sm">Düşüncelerinizi ve keşiflerinizi paylaşın</p>
      </div>

      {/* Quick Actions */}
      {!isComposing && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setIsComposing(true)}
            className="flex-1 bg-card rounded-2xl p-4 shadow-card border border-border/40 flex items-center gap-3 text-left hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <span className="text-muted-foreground text-sm">Bir güncelleme paylaşın...</span>
          </button>
          <button
            onClick={() => setIsRecommendDialogOpen(true)}
            className="bg-card rounded-2xl p-4 shadow-card border border-border/40 flex items-center justify-center hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
            title="Kitap Öner"
          >
            <BookOpen className="w-5 h-5 text-primary" />
          </button>
        </div>
      )}

      {/* Compose Card */}
      {isComposing && (
        <div className="bg-card rounded-2xl p-5 shadow-card border border-border/40 mb-6 animate-scale-in">
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { type: 'update' as const, icon: MessageSquare, label: 'Güncelleme' },
              { type: 'quote' as const, icon: Quote, label: 'Alıntı' },
              { type: 'poll' as const, icon: BarChart3, label: 'Anket' },
              { type: 'recommendation' as const, icon: BookOpen, label: 'Öneri' },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => setPostType(item.type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  postType === item.type
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          <Textarea
            placeholder={
              postType === 'quote' ? 'Kitaptan bir alıntı paylaşın...' :
                postType === 'poll' ? 'Anket sorunuzu yazın...' :
                  postType === 'recommendation' ? 'Neden bu kitabı öneriyorsunuz?' :
                    'Aklınızdan ne geçiyor?'
            }
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="min-h-24 bg-muted/50 border-0 rounded-xl resize-none mb-3 text-sm"
          />

          {/* Poll Options */}
          {postType === 'poll' && (
            <div className="space-y-2 mb-3">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Seçenek ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...pollOptions];
                      newOptions[index] = e.target.value;
                      setPollOptions(newOptions);
                    }}
                    className="bg-muted/50 border-0 rounded-xl text-sm"
                  />
                  {pollOptions.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ''])} className="w-full text-xs">
                  Seçenek Ekle
                </Button>
              )}
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative mb-3 inline-block">
              <img src={imagePreview} alt="Önizleme" className="w-28 h-28 object-cover rounded-xl" />
              <button onClick={handleRemoveImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-soft">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Select value={selectedBookId} onValueChange={setSelectedBookId}>
              <SelectTrigger className="w-36 h-9 bg-muted/50 border-0 rounded-lg text-xs">
                <SelectValue placeholder="Kitap seçin" />
              </SelectTrigger>
              <SelectContent>
                {books.map(book => (
                  <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {postType !== 'poll' && (
              <label className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors duration-200">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <ImagePlus className="w-4 h-4 text-muted-foreground" />
              </label>
            )}

            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => { setIsComposing(false); handleRemoveImage(); setPostType('update'); }} className="text-muted-foreground text-xs">
              İptal
            </Button>
            <Button size="sm" onClick={handlePost} className="rounded-xl text-xs" disabled={addFeedPost.isPending || isUploading}>
              {(addFeedPost.isPending || isUploading) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <><Send className="w-3.5 h-3.5 mr-1.5" />Paylaş</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Recommend Book Dialog */}
      <Dialog open={isRecommendDialogOpen} onOpenChange={setIsRecommendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Kütüphanenizden Kitap Önerin</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-4 max-h-80 overflow-y-auto">
            {myBooks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Kütüphanenizde kitap yok</p>
            ) : (
              myBooks.map(book => (
                <button
                  key={book.id}
                  onClick={() => handleRecommendBook(book)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-all duration-200 text-left group"
                >
                  <img
                    src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
                    alt={book.title}
                    className="w-10 h-14 object-cover rounded-lg shadow-soft"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{book.title}</p>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                  </div>
                  <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feed */}
      <div className="space-y-4">
        <PinnedAnnouncement />
        <BookVotingSection />
        {posts.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 shadow-card border border-border/40 text-center">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/25 mb-3" />
            <p className="text-muted-foreground text-sm">Henüz gönderi yok. İlk gönderiyi siz paylaşın!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <div
                key={post.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
              >
                <FeedPost post={getTransformedPost(post)} userCurrentPage={userCurrentPage} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialFeedTab;
