import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Star,
  Users,
  Play,
  Loader2,
  Edit3,
  Pencil,
  Download,
  BookMarked,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBook } from '@/hooks/useBooks';
import { useBookReviews, useCreateBookReview, useBookAverageRating, useUserBookReview } from '@/hooks/useBookReviews';
import { useUserBookByBookId, useUpsertUserBook } from '@/hooks/useUserBooks';
import { useBookProgress } from '@/hooks/useProgress';
import { useProfiles } from '@/hooks/useProfiles';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';
import BookEditDialog from '@/components/BookEditDialog';
import BookDiscussions from '@/components/BookDiscussions';
import RatingBreakdownChart from '@/components/RatingBreakdownChart';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ListManagementDialog from '@/components/ListManagementDialog';

const statusConfig = {
  want_to_read: { label: 'Okumak İstiyorum', icon: BookMarked, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50' },
  reading: { label: 'Okuyorum', icon: Clock, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50' },
  read: { label: 'Okudum', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50' },
  dnf: { label: 'Yarıda Bıraktım', icon: BookOpen, color: 'bg-muted text-muted-foreground border-border' },
};

const BookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);

  const { data: book, isLoading: bookLoading } = useBook(bookId || '');
  const { data: reviews = [] } = useBookReviews(bookId);
  const { data: avgRating } = useBookAverageRating(bookId);
  const { data: userReview } = useUserBookReview(user?.id, bookId);
  const { data: userBook } = useUserBookByBookId(user?.id || '', bookId || '');
  const { data: bookProgress = [] } = useBookProgress(bookId || '');
  const { data: profiles = [] } = useProfiles();
  const upsertUserBook = useUpsertUserBook();

  const createReview = useCreateBookReview();

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const userProgressEntry = bookProgress.find(p => p.user_id === user?.id);
  const hasCompletedBook = userProgressEntry?.status === 'completed' || userBook?.status === 'read';

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

  const handleShelfChange = async (status: 'want_to_read' | 'reading' | 'read' | 'dnf') => {
    if (!user || !bookId) { toast.error('Giriş yapmalısınız'); return; }
    try {
      await upsertUserBook.mutateAsync({ user_id: user.id, book_id: bookId, status });
      toast.success(`Kitap "${statusConfig[status].label}" listesine eklendi!`);
    } catch {
      toast.error('Bir hata oluştu');
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !bookId) { toast.error('Giriş yapmalısınız'); return; }
    if (!hasCompletedBook) { toast.error('Sadece bitirdiğiniz kitapları değerlendirebilirsiniz'); return; }
    try {
      await createReview.mutateAsync({ book_id: bookId, user_id: user.id, rating, review_text: reviewText || null });
      setReviewDialogOpen(false);
      setReviewText('');
      toast.success('Değerlendirmeniz kaydedildi!');
    } catch {
      toast.error('Değerlendirme kaydedilirken hata oluştu');
    }
  };

  if (bookLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Geri
        </Button>
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Kitap bulunamadı</p>
        </div>
      </div>
    );
  }

  const publisherMatch = book?.description?.match(/Yayınevi:\s*(.+)$/);
  const publisher = publisherMatch ? publisherMatch[1] : null;
  const description = book?.description ? book.description.replace(/\n\nYayınevi:\s*.+$/, '').replace(/Yayınevi:\s*.+$/, '') : null;

  const currentStatus = userBook?.status as keyof typeof statusConfig | undefined;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Button>
        {(isAdmin || book.added_by === user?.id) && (
          <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)} className="gap-2">
            <Pencil className="w-4 h-4" />
            Düzenle
          </Button>
        )}
      </div>

      <div className="px-4 pt-6">
        {/* Book Hero */}
        <div className="flex gap-5">
          <div className="w-32 h-48 rounded-lg overflow-hidden shadow-md border-2 border-border flex-shrink-0">
            <img
              src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 py-1">
            <h1 className="text-xl font-serif font-bold text-foreground">{book.title}</h1>
            <p className="text-muted-foreground mt-1">{book.author}</p>
            {publisher && (
              <p className="text-sm font-medium text-muted-foreground mt-0.5">{publisher}</p>
            )}

            {avgRating && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-semibold">{avgRating.average.toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({avgRating.count} değerlendirme)
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {book.genre && (
                <span className="px-2 py-1 bg-accent text-xs font-medium rounded">
                  {book.genre}
                </span>
              )}
              <span className="px-2 py-1 bg-muted text-xs font-medium rounded flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {book.page_count} sayfa
              </span>
            </div>
          </div>
        </div>

        {/* Shelf status buttons — primary CTA */}
        <div className="mt-5">
          <p className="text-xs text-muted-foreground font-medium mb-2">Rafıma ekle</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = currentStatus === key;
              return (
                <button
                  key={key}
                  onClick={() => handleShelfChange(key)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    isActive ? cfg.color + ' border-current/30 ring-1 ring-current/20' : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-2 mt-3">
          {book.epub_url && (
            <Button className="flex-1 gap-2" onClick={() => navigate(`/reader/${book.id}`)}>
              <Play className="w-4 h-4" />
              Okumaya Başla
            </Button>
          )}
          <Button variant="outline" className="gap-2 flex-1" onClick={() => setIsListModalOpen(true)}>
            Listeleri Yönet
          </Button>
        </div>

        {/* EPUB Download */}
        {book.epub_url && (
          <div className="mt-3">
            <a
              href={book.epub_url}
              download={`${book.title}.epub`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground hover:bg-accent/80 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              EPUB Dosyasını İndir
            </a>
          </div>
        )}

        {/* Description */}
        <div className="py-6 border-b border-border/50">
          <h3 className="font-semibold mb-3 tracking-tight">Kitap Özeti</h3>
          {description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Bu kitap için henüz bir özet girilmemiş.</p>
          )}
        </div>

        {/* Rating breakdown chart */}
        {avgRating && avgRating.count > 0 && (
          <RatingBreakdownChart bookId={bookId || ''} averageRating={avgRating.average} ratingCount={avgRating.count} />
        )}

        {/* Reviews Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-lg">Değerlendirmeler</h2>

            {hasCompletedBook && !userReview && (
              <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Edit3 className="w-3 h-3" />
                    Değerlendir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Kitabı Değerlendir</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Puanınız (1-10)</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            onClick={() => setRating(num)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                              rating >= num
                                ? "bg-amber-400 text-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Yorumunuz (opsiyonel)</p>
                      <Textarea
                        placeholder="Bu kitap hakkında ne düşündünüz?"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="min-h-24"
                      />
                    </div>
                    <Button onClick={handleSubmitReview} className="w-full" disabled={createReview.isPending}>
                      {createReview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gönder'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!hasCompletedBook && user && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground">
                💡 Sadece bitirdiğiniz kitapları değerlendirebilirsiniz
              </p>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="bg-card rounded-xl p-6 text-center border-2 border-border">
              <Star className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Henüz değerlendirme yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const profile = getProfile(review.user_id);
                return (
                  <div key={review.id} className="bg-card rounded-xl p-4 border-2 border-border">
                    <div className="flex items-start gap-3">
                      <button onClick={() => navigate(`/members/${review.user_id}`)}>
                        <Avatar
                          src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`}
                          name={profile?.display_name || profile?.username || 'Anonim'}
                          size="sm"
                        />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/members/${review.user_id}`)}
                            className="font-medium text-sm hover:underline"
                          >
                            {profile?.display_name || profile?.username || 'Anonim'}
                          </button>
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-sm font-medium">{review.rating}/10</span>
                          </div>
                        </div>
                        {review.review_text && (
                          <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Readers Progress */}
        {bookProgress.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Okuyanlar
            </h2>
            <div className="space-y-3">
              {bookProgress.slice(0, 5).map((progress) => {
                const profile = getProfile(progress.user_id);
                if (!profile) return null;
                const percentage = book.page_count > 0 ? Math.round((progress.current_page / book.page_count) * 100) : 0;
                return (
                  <div
                    key={progress.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-lg border-2 border-border cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/members/${progress.user_id}`)}
                  >
                    <Avatar
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                      name={profile.display_name || profile.username}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{profile.display_name || profile.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Discussions */}
        <BookDiscussions bookId={bookId || ''} />
      </div>

      {/* Edit Dialog */}
      {book && (
        <BookEditDialog book={book} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      )}
      <ListManagementDialog bookId={bookId || ''} open={isListModalOpen} onOpenChange={setIsListModalOpen} />
    </div>
  );
};

export default BookDetail;
