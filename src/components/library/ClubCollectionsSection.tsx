import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, BookOpen, CheckCircle, Clock, Loader2, Shield, Trash2, Send, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useCommunityLists, useCreateBookList, useBookListItems, useUpdateBookList, BookList } from '@/hooks/useBookLists';
import { useClubBooks, useBooks, useDeleteBook, useSubmitBookToClub } from '@/hooks/useBooks';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import BookCard from '@/components/BookCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClubCollectionsSectionProps {
  searchQuery: string;
}

const ClubCollectionsSection = ({ searchQuery }: ClubCollectionsSectionProps) => {
  const { user, profile } = useAuth();
  const { data: communityLists = [], isLoading } = useCommunityLists();
  const { data: clubBooks = [], isLoading: clubBooksLoading } = useClubBooks();
  const { data: allBooks = [] } = useBooks();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const createList = useCreateBookList();
  const updateList = useUpdateBookList();
  const deleteBook = useDeleteBook();
  const submitToClub = useSubmitBookToClub();

  const [activeClubTab, setActiveClubTab] = useState<'library' | 'lists'>('library');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [newList, setNewList] = useState({ name: '', description: '' });

  const pendingLists = communityLists.filter(list => !list.is_approved);
  const approvedLists = communityLists.filter(list => list.is_approved);

  // Books user can submit to club (not already submitted/approved)
  const submittableBooks = allBooks.filter(
    (book) => book.added_by === user?.id && !book.club_status
  );

  const handleCreateCommunityList = async () => {
    if (!newList.name.trim() || !user || !profile) {
      toast.error('Liste adı girin');
      return;
    }

    try {
      await createList.mutateAsync({
        user_id: user.id,
        group_code: profile.group_code,
        name: newList.name,
        description: newList.description || null,
        is_default: false,
        is_community: true,
        is_approved: isAdmin ? true : false,
        list_type: 'custom',
      });
      setNewList({ name: '', description: '' });
      setIsCreateDialogOpen(false);
      toast.success(isAdmin ? 'Liste oluşturuldu!' : 'Liste oluşturuldu! Admin onayı bekleniyor.');
    } catch {
      toast.error('Liste oluşturulurken hata oluştu');
    }
  };

  const handleApproveList = async (listId: string) => {
    try {
      await updateList.mutateAsync({ id: listId, is_approved: true });
      toast.success('Liste onaylandı!');
    } catch {
      toast.error('Liste onaylanırken hata oluştu');
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    try {
      await deleteBook.mutateAsync(bookId);
      toast.success('Kitap kulüp kütüphanesinden kaldırıldı');
    } catch {
      toast.error('Kitap kaldırılırken hata oluştu');
    }
  };

  const handleSubmitToClub = async (bookId: string) => {
    try {
      await submitToClub.mutateAsync(bookId);
      toast.success('Kitap kulüp kütüphanesine önerildi! Admin onayı bekleniyor.');
    } catch {
      toast.error('Kitap önerilemedi');
    }
  };

  if (isLoading || clubBooksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredClubBooks = clubBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Club Sub-tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveClubTab('library')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
            activeClubTab === 'library'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          <BookOpen className="w-4 h-4" />
          Kulüp Kütüphanesi
        </button>
        <button
          onClick={() => setActiveClubTab('lists')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
            activeClubTab === 'lists'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          <Users className="w-4 h-4" />
          Kulüp Listeleri
        </button>
      </div>

      {/* Club Library Tab */}
      {activeClubTab === 'library' && (
        <div className="space-y-4">
          {/* Submit to club button */}
          <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Send className="w-4 h-4" />
                Kulüp Kütüphanesine Kitap Öner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">Kulübe Kitap Öner</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Kendi kütüphanenizden bir kitabı kulüp kütüphanesine önerin. Admin onayından sonra herkes görebilecek.
              </p>
              <div className="space-y-2 mt-4">
                {submittableBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Önerilebilecek kitap yok. Önce kütüphanenize kitap ekleyin.
                  </p>
                ) : (
                  submittableBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-border"
                    >
                      <img
                        src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
                        alt={book.title}
                        className="w-10 h-14 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitToClub(book.id)}
                        disabled={submitToClub.isPending}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Öner
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {filteredClubBooks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center py-12 bg-card rounded-2xl border border-border/40 shadow-card flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-foreground font-medium mb-1">Kulüp kütüphanesinde kitap yok</p>
              <p className="text-muted-foreground text-sm">İlk kitabı siz önerin!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredClubBooks.map((book) => (
                <div key={book.id} className="relative">
                  <BookCard
                    book={{
                      id: book.id,
                      title: book.title,
                      author: book.author,
                      total_pages: book.page_count,
                      cover_url: book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop',
                    }}
                    size="md"
                    className="bg-card p-3 rounded-xl shadow-soft"
                  />
                  {/* Admin remove button */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all shadow-sm">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Kaldır
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Kitabı Kaldır</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{book.title}" kitabını kulüp kütüphanesinden kaldırmak istediğinize emin misiniz?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveBook(book.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Kaldır
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Club Lists Tab */}
      {activeClubTab === 'lists' && (
        <>
          {/* Admin: Pending Approvals */}
          {isAdmin && pendingLists.length > 0 && (
            <div>
              <h3 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Onay Bekleyen Listeler
              </h3>
              <div className="space-y-2">
                {pendingLists.map(list => (
                  <div key={list.id} className="flex items-center justify-between p-3 bg-accent rounded-xl border-2 border-border">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{list.name}</p>
                        {list.description && <p className="text-xs text-muted-foreground">{list.description}</p>}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleApproveList(list.id)} disabled={updateList.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Onayla
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Community Lists */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4" />
                Kulüp Listeleri
              </h3>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    {isAdmin ? 'Oluştur' : 'Öner'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">{isAdmin ? 'Kulüp Listesi Oluştur' : 'Koleksiyon Öner'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {!isAdmin && (
                      <p className="text-sm text-muted-foreground">
                        Kulüp için bir koleksiyon önerin. Admin onayından sonra herkes görebilecek.
                      </p>
                    )}
                    <div>
                      <Label htmlFor="collectionName">Koleksiyon Adı</Label>
                      <Input id="collectionName" value={newList.name} onChange={(e) => setNewList({ ...newList, name: e.target.value })} placeholder="Örn: 2024 Yılın En İyileri" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="collectionDesc">Açıklama</Label>
                      <Textarea id="collectionDesc" value={newList.description} onChange={(e) => setNewList({ ...newList, description: e.target.value })} placeholder="Bu koleksiyon hakkında kısa bir açıklama..." className="mt-1.5 resize-none" rows={3} />
                    </div>
                    <Button onClick={handleCreateCommunityList} className="w-full" disabled={createList.isPending}>
                      {createList.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {isAdmin ? 'Oluştur' : 'Gönder'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {approvedLists.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center py-12 bg-card rounded-2xl border border-border/40 shadow-card flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-medium mb-1">Henüz kulüp listesi yok</p>
                <p className="text-muted-foreground text-sm">Bir liste önererek arkadaşlarınızla paylaşın!</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {approvedLists.map(list => (
                  <CommunityListCard key={list.id} list={list} isSelected={selectedListId === list.id} onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)} />
                ))}
              </div>
            )}
          </div>

          {selectedListId && <CollectionBooksView listId={selectedListId} books={allBooks} searchQuery={searchQuery} />}
        </>
      )}
    </div>
  );
};

interface CommunityListCardProps {
  list: BookList;
  isSelected: boolean;
  onClick: () => void;
}

const CommunityListCard = ({ list, isSelected, onClick }: CommunityListCardProps) => {
  const bookCount = list.book_list_items?.[0]?.count || 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl text-left transition-all w-full',
        isSelected ? 'bg-primary text-primary-foreground' : 'bg-card border-2 border-border hover:border-primary'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isSelected ? 'bg-primary-foreground/20' : 'bg-accent')}>
        <Users className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{list.name}</p>
          <Badge variant="secondary" className="text-xs">{bookCount} kitap</Badge>
        </div>
        {list.description && (
          <p className={cn('text-sm truncate mt-0.5', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{list.description}</p>
        )}
      </div>
    </button>
  );
};

interface CollectionBooksViewProps {
  listId: string;
  books: { id: string; title: string; author: string; cover_url: string | null; page_count: number; genre: string | null; description: string | null; added_by: string | null; club_status: string | null; epub_url: string | null; created_at: string; updated_at: string; }[];
  searchQuery: string;
}

const CollectionBooksView = ({ listId, books, searchQuery }: CollectionBooksViewProps) => {
  const { data: items = [], isLoading } = useBookListItems(listId);

  const listBooks = books.filter(book => items.some(item => item.book_id === book.id));
  const filteredBooks = listBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (filteredBooks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="text-center py-12 bg-card rounded-2xl border border-border/40 shadow-card flex flex-col items-center mt-4 col-span-2"
      >
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-foreground font-medium mb-1">Bu koleksiyonda kitap yok</p>
        <p className="text-muted-foreground text-sm">Sonradan kitap eklenebilir.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {filteredBooks.map(book => (
        <BookCard
          key={book.id}
          book={{
            id: book.id,
            title: book.title,
            author: book.author,
            total_pages: book.page_count,
            cover_url: book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop',
          }}
          size="md"
          className="bg-card p-3 rounded-xl shadow-soft"
        />
      ))}
    </div>
  );
};

export default ClubCollectionsSection;
