import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Play,
  Loader2,
  Edit3,
  Pencil,
  Download,
  BookMarked,
  CheckCircle,
  Clock,
  Trophy
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
import { useUserBookByBookId } from '@/hooks/useUserBooks';
import { useClubSchedule, useAddClubSchedule, useDeleteClubSchedule } from '@/hooks/useClubSchedule';
import { useAddBookToDefaultList } from '@/hooks/useBookListActions';
import { useProfiles } from '@/hooks/useProfiles';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import BookEditDialog from '@/components/BookEditDialog';
import QuietReflectionArea from '@/components/QuietReflectionArea';
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
  const { data: userBook } = useUserBookByBookId(user?.id || '', bookId || '');
  const { data: schedule = [] } = useClubSchedule();
  const { data: profiles = [] } = useProfiles();
  const addToDefaultList = useAddBookToDefaultList();
  const addClubSchedule = useAddClubSchedule();
  const deleteClubSchedule = useDeleteClubSchedule();

  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);
  const activeSchedule = schedule.find(s => s.book_id === bookId && s.status === 'active');

  const handleToggleClubBook = async () => {
    if (!user) return;
    try {
      if (activeSchedule) {
        await deleteClubSchedule.mutateAsync(activeSchedule.id);
        toast.success('Kitap kulüp ortak hedefinden çıkarıldı');
      } else {
        const userProfile = getProfile(user.id);
        const effectiveGroupCode = userProfile?.group_code || 'ZENHUB';
        await addClubSchedule.mutateAsync({
          book_id: bookId!,
          group_code: effectiveGroupCode,
          start_date: new Date().toISOString().split('T')[0],
          end_date: null,
          status: 'active',
          notes: 'Admin tarafından belirlendi',
          created_by: user.id
        });
        toast.success('Kitap Kulüp Ortak Kitabı olarak ayarlandı! 🌱');
      }
    } catch {
      toast.error('Grup hedefi güncellenirken hata oluştu');
    }
  };

  const handleShelfChange = async (status: 'want_to_read' | 'reading' | 'read' | 'dnf') => {
    if (!user || !bookId) { toast.error('Giriş yapmalısınız'); return; }
    try {
      await addToDefaultList.mutateAsync({ bookId, listType: status });
      toast.success(`Kitap "${statusConfig[status].label}" listesine eklendi!`);
    } catch {
      toast.error('Bir hata oluştu');
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
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between max-w-md mx-auto">
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

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mt-3">
            <Button
              variant={activeSchedule ? "destructive" : "default"}
              className={cn("w-full gap-2", !activeSchedule && "bg-forest hover:bg-forest/90")}
              onClick={handleToggleClubBook}
              disabled={addClubSchedule.isPending || deleteClubSchedule.isPending}
            >
              <Trophy className="w-4 h-4" />
              {activeSchedule ? 'Kulüp Hedefinden Çıkar' : 'Kulüp Ortak Kitabı Yap'}
            </Button>
          </div>
        )}

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

        {/* Personal Note Area */}
        <QuietReflectionArea bookId={bookId || ''} />
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
