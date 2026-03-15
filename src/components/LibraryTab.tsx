import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, BookOpen, Loader2, Upload, Image, Trash2, BookText, MoreVertical, Library, FileText, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import BookCard from './BookCard';
import BookSearchDialog from './BookSearchDialog';
import AllMyBooksSection from './library/AllMyBooksSection';
import MyLibrarySection from './library/MyLibrarySection';
import SuggestBookSection from './library/SuggestBookSection';
import { useBooks, useAddBook, useDeleteBook, useSubmitBookToClub } from '@/hooks/useBooks';
import { supabase } from '@/integrations/supabase/client';
import { useBookLists } from '@/hooks/useBookLists';
import { useAddBookToDefaultList, useAddBookToCustomList } from '@/hooks/useBookListActions';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';

import { toast } from 'sonner';

type LibraryTabType = 'all_my_books' | 'my_lists' | 'club_library';

const LibraryTab = () => {
  const { user, profile } = useAuth();
  const { data: books = [], isLoading } = useBooks();
  const { data: userLists = [] } = useBookLists(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: schedule = [] } = useClubSchedule();
  const addBook = useAddBook();
  const deleteBook = useDeleteBook();
  const submitToClub = useSubmitBookToClub();
  const addToDefaultList = useAddBookToDefaultList();
  const addToCustomList = useAddBookToCustomList();
  const { upload, isUploading } = useFileUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLibraryTab, setActiveLibraryTab] = useState<LibraryTabType>(() => {
    return (sessionStorage.getItem('activeLibraryTab') as LibraryTabType) || 'all_my_books';
  });
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isSuggestSearchOpen, setIsSuggestSearchOpen] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  const [selectedDestination, setSelectedDestination] = useState<string>('none');
  const [isClubBookToggle, setIsClubBookToggle] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    publisher: '',
    pages: '',
    genre: '',
    description: '',
    cover_url: '',
  });

  const clubBooks = useMemo(() => books.filter(b => b.club_status && ['approved', 'active_goal'].includes(b.club_status)), [books]);
  const filteredClubBooks = useMemo(() => {
    return clubBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clubBooks, searchQuery]);

  const activeClubBookIds = useMemo(() => {
    return schedule.filter(s => s.status === 'active').map(s => s.book_id);
  }, [schedule]);

  const handleTabChange = (tab: LibraryTabType) => {
    setActiveLibraryTab(tab);
    sessionStorage.setItem('activeLibraryTab', tab);
    setSearchQuery('');
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEpubFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEpubFile(file);
    }
  };

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author || !newBook.pages) {
      toast.error('Lütfen başlık, yazar ve sayfa sayısı girin');
      return;
    }

    const pagesCount = parseInt(newBook.pages);
    if (isNaN(pagesCount) || pagesCount <= 0) {
      toast.error('Lütfen geçerli bir sayfa sayısı girin');
      return;
    }

    if (!user) {
      toast.error('Kitap eklemek için giriş yapmalısınız');
      return;
    }

    try {
      let finalCoverUrl = newBook.cover_url || `https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop&t=${Date.now()}`;
      let finalEpubUrl = null;

      if (coverFile) {
        const uploadedCoverUrl = await upload('covers', coverFile, user.id);
        if (uploadedCoverUrl) {
          finalCoverUrl = uploadedCoverUrl;
        }
      }

      if (epubFile) {
        const uploadedEpubUrl = await upload('book-files', epubFile);
        if (uploadedEpubUrl) {
          finalEpubUrl = uploadedEpubUrl;
        }
      }

      const payload = {
        title: newBook.title,
        author: newBook.author,
        page_count: pagesCount,
        genre: newBook.genre || null,
        publisher: newBook.publisher || null,
        description: newBook.description || null,
        cover_url: finalCoverUrl,
        epub_url: finalEpubUrl,
        added_by: user.id,
        ...(isAdmin && isClubBookToggle ? { club_status: 'approved' } : {}),
      };

      const createdBook = await addBook.mutateAsync(payload);

      if (selectedDestination !== 'none') {
        const defaultTypes = ['want_to_read', 'reading', 'read', 'dnf'];
        if (defaultTypes.includes(selectedDestination)) {
          await addToDefaultList.mutateAsync({
            bookId: createdBook.id,
            listType: selectedDestination as 'want_to_read' | 'reading' | 'read' | 'dnf',
          });
        } else {
          await addToCustomList.mutateAsync({
            listId: selectedDestination,
            bookId: createdBook.id,
          });
        }
      }

      setNewBook({ title: '', author: '', publisher: '', pages: '', genre: '', description: '', cover_url: '' });
      setCoverFile(null);
      setCoverPreview(null);
      setEpubFile(null);
      setSelectedDestination('none');
      setIsClubBookToggle(false);
      setIsAddDialogOpen(false);
      setIsFormVisible(false);
      toast.success('Kitap eklendi!');
    } catch {
      toast.error('Kitap eklenirken hata oluştu');
    }
  };

  const handleBookFromSearch = (book: { title: string; author: string; pages: number; cover_url: string | null; genre: string | null; description: string | null; publisher: string | null; }) => {
    setNewBook({
      title: book.title,
      author: book.author,
      publisher: book.publisher || '',
      pages: book.pages.toString(),
      genre: book.genre || '',
      description: book.description || '',
      cover_url: book.cover_url || '',
    });
    setCoverFile(null);
    setCoverPreview(book.cover_url || null);
    setIsSearchDialogOpen(false);
    setIsAddDialogOpen(true);
    setIsFormVisible(true);
  };

  const handleBookSuggestFromSearch = async (book: { title: string; author: string; cover_url: string | null; description: string | null; }) => {
    const exists = clubBooks.some(cb => cb.title.toLowerCase() === book.title.toLowerCase());
    if (exists) {
      toast.error('Kütüphanemizde mevcut');
      return;
    }

    if (!user || !profile?.group_code) {
      toast.error('Kullanıcı bilgisi bulunamadı');
      return;
    }
    
    try {
      await addBook.mutateAsync({
        title: book.title,
        author: book.author,
        description: book.description || null,
        cover_url: book.cover_url || null,
        page_count: 0,
        added_by: user.id,
      });
      const { data: newBooks } = await supabase
        .from('books')
        .select('id')
        .eq('title', book.title)
        .eq('added_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (newBooks && newBooks.length > 0) {
        await submitToClub.mutateAsync(newBooks[0].id);
      }
      toast.success('Kitap önerisi gönderildi, admin onayına sunuldu.');
    } catch (error) {
      toast.error('Öneri gönderilirken hata oluştu.');
    } finally {
      setIsSuggestSearchOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-6 pb-24 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="px-5 pt-8 pb-24 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-serif font-bold text-foreground">
          Kütüphane
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Kitap koleksiyonunuzu yönetin
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-5">
        <div className="flex gap-1 rounded-xl bg-muted/30 p-1">
          <button
            onClick={() => handleTabChange('all_my_books')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${activeLibraryTab === 'all_my_books' ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Kitaplarım</span>
          </button>
          <button
            onClick={() => handleTabChange('my_lists')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${activeLibraryTab === 'my_lists' ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <List className="w-4 h-4 shrink-0" />
            <span className="truncate">Listelerim</span>
          </button>
          <button
            onClick={() => handleTabChange('club_library')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${activeLibraryTab === 'club_library' ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Library className="w-4 h-4 shrink-0" />
            <span className="truncate">Kulüp</span>
          </button>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeLibraryTab === 'club_library' ? 'Kulüp kütüphanesinde ara...' :
                activeLibraryTab === 'my_lists' ? 'Listelerde ara...' :
                'Kitaplarımda ara...'
              }
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:border-primary/30"
            />
          </div>

        {/* --- Content Rendering based on Tab --- */}
        {activeLibraryTab === 'all_my_books' && (
          <AllMyBooksSection searchQuery={searchQuery} />
        )}

        {activeLibraryTab === 'my_lists' && (
          <MyLibrarySection searchQuery={searchQuery} />
        )}

        {activeLibraryTab === 'club_library' && (
          <div>
            <h2 className="text-lg font-serif font-semibold text-foreground mb-4">Kulüp Kütüphanesi</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredClubBooks.map((book) => (
                <div key={book.id} className="relative h-full flex flex-col group">
                  <BookCard
                    book={{
                      id: book.id,
                      title: book.title,
                      author: book.author,
                      total_pages: book.page_count,
                      cover_url: book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop',
                    }}
                    size="full"
                    isClubBook={activeClubBookIds.includes(book.id)}
                    className="bg-card rounded-xl shadow-soft flex-1 overflow-hidden"
                  />
                  {(isAdmin || book.added_by === user?.id) && (
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button aria-label="Seçenekler" className="w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors shadow-sm">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive cursor-pointer">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Sil
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Kitabı Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{book.title}" kitabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteBook.mutate(book.id, {
                                      onSuccess: () => toast.success('Kitap silindi'),
                                      onError: () => toast.error('Kitap silinirken hata oluştu'),
                                    });
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sil
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
            {filteredClubBooks.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center py-16 bg-card rounded-xl border border-border/40 shadow-card flex flex-col items-center mt-4 col-span-2"
              >
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                  <Library className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-medium mb-1">Kulüp kitabı bulunamadı</p>
                <p className="text-muted-foreground text-sm max-w-[250px]">Henüz kulüp kütüphanesine kitap eklenmemiş veya aramanızla eşleşmiyor.</p>
              </motion.div>
            )}
            
            <SuggestBookSection />
          </div>
        )}

      </div>
    </div>

    {/* FAB + Dialogs outside animated container */}
    <div className="fixed bottom-24 right-4 sm:right-6 z-40">
      {(activeLibraryTab === 'club_library' && !isAdmin) ? (
        <Button
          onClick={() => setIsSuggestSearchOpen(true)}
          className="h-12 px-5 rounded-full shadow-elevated"
          aria-label="Kitap Öner"
        >
          Öner
        </Button>
      ) : (
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setIsFormVisible(false); }}>
          <DialogTrigger asChild>
            <Button
              className="w-14 h-14 rounded-full shadow-elevated"
              size="icon"
              aria-label="Yeni Kitap Ekle"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Yeni Kitap Ekle
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Search from combined sources */}
          {!isFormVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              <Button
                variant="outline"
                className="w-full h-14 rounded-xl text-base shadow-sm group hover:border-primary/50"
                onClick={() => setIsSearchDialogOpen(true)}
              >
                <Search className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary transition-colors" />
                Kitap Ara
              </Button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider font-medium">
                  <span className="bg-background px-4 text-muted-foreground">
                    veya
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full h-12 rounded-xl text-muted-foreground hover:bg-muted"
                onClick={() => setIsFormVisible(true)}
              >
                Bilgileri manuel gir
              </Button>
            </motion.div>
          )}

          <AnimatePresence>
            {isFormVisible && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-6 w-full max-w-full overflow-x-hidden overflow-y-visible px-1"
              >
                {/* Cover Focal Point */}
                <div className="flex justify-center mb-8 relative pt-4">
                  <div className="relative w-32 sm:w-36 group">
                    {coverPreview ? (
                      <>
                        <div className="absolute inset-0 -z-10 translate-y-4 scale-95 opacity-40 blur-2xl">
                          <img src={coverPreview} alt="" className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <img src={coverPreview} alt="Kapak" className="relative w-full h-auto object-cover aspect-[2/3] rounded-xl shadow-elevated border border-border/20" />
                      </>
                    ) : (
                      <div className="w-full aspect-[2/3] bg-muted/50 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground border-2 border-dashed border-border/60">
                        <Image className="w-8 h-8 opacity-40" />
                        <span className="text-xs">Kapak</span>
                      </div>
                    )}
                    <label className="absolute bottom-2 right-2 w-10 h-10 bg-background/90 backdrop-blur-sm border border-border/50 rounded-full flex items-center justify-center cursor-pointer hover:bg-background transition-all shadow-sm">
                      <Upload className="w-4 h-4" />
                      <input type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kitap Adı *</Label>
                    <Input id="title" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} placeholder="Kitap adını girin" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="author" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Yazar *</Label>
                    <Input id="author" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} placeholder="Yazar adını girin" className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="pages" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sayfa *</Label>
                      <Input id="pages" type="number" value={newBook.pages} onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })} placeholder="0" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="genre" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tür</Label>
                      <Input id="genre" value={newBook.genre} onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })} placeholder="Roman, Bilim..." className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="publisher" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Yayınevi</Label>
                    <Input id="publisher" value={newBook.publisher} onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })} placeholder="Yayınevi adı" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Açıklama</Label>
                    <Textarea id="description" value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} placeholder="Kitap hakkında kısa bir açıklama" className="mt-1.5 min-h-[80px]" />
                  </div>

                  {/* EPUB Upload */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">EPUB Dosyası</Label>
                    <div className="mt-1.5">
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 cursor-pointer transition-colors">
                        <BookText className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {epubFile ? epubFile.name : 'EPUB dosyası seç (opsiyonel)'}
                        </span>
                        <input type="file" accept=".epub" onChange={handleEpubFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Destination List */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kişisel Listeye Ekle</Label>
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Liste seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Listeye ekleme</SelectItem>
                        <SelectItem value="want_to_read">Okumak İstediklerim</SelectItem>
                        <SelectItem value="reading">Okuyorum</SelectItem>
                        <SelectItem value="read">Okudum</SelectItem>
                        <SelectItem value="dnf">Yarıda Bıraktım</SelectItem>
                        {userLists.filter(l => !l.is_default && !l.is_community).map(list => (
                          <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center justify-between p-4 mt-2 bg-muted/40 rounded-xl border border-border/50">
                      <div className="space-y-0.5">
                        <Label>Kulüp Kütüphanesi</Label>
                        <p className="text-xs text-muted-foreground">Bu kitabı herkesin görebildiği kulüp kütüphanesine ekle</p>
                      </div>
                      <Switch 
                        checked={isClubBookToggle} 
                        onCheckedChange={setIsClubBookToggle} 
                      />
                    </div>
                  )}

                </div>

                <Button onClick={handleAddBook} className="w-full h-12 rounded-xl text-base mt-6 text-white font-medium shadow-elevated" disabled={addBook.isPending || isUploading}>
                  {(addBook.isPending || isUploading) ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  Kitap Ekle
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
      )}
    </div>

    <BookSearchDialog
      open={isSearchDialogOpen}
      onOpenChange={setIsSearchDialogOpen}
      onSelectBook={handleBookFromSearch}
    />
    <BookSearchDialog
      open={isSuggestSearchOpen}
      onOpenChange={setIsSuggestSearchOpen}
      onSelectBook={handleBookSuggestFromSearch}
    />
    </>
  );
};

export default LibraryTab;
