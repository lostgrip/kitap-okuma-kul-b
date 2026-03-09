import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, BookOpen, Loader2, Upload, Image, Trash2, BookText, MoreVertical } from 'lucide-react';
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
import BookCard from './BookCard';
import CombinedBookSearchDialog from './CombinedBookSearchDialog';
import MyLibrarySection from './library/MyLibrarySection';
import { useBooks, useAddBook, useDeleteBook } from '@/hooks/useBooks';
import { useBookLists } from '@/hooks/useBookLists';
import { useAddBookToDefaultList, useAddBookToCustomList } from '@/hooks/useBookListActions';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';

import { toast } from 'sonner';

const LibraryTab = () => {
  const { user } = useAuth();
  const { data: books = [], isLoading } = useBooks();
  const { data: userLists = [] } = useBookLists(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: schedule = [] } = useClubSchedule();
  const addBook = useAddBook();
  const deleteBook = useDeleteBook();
  const addToDefaultList = useAddBookToDefaultList();
  const addToCustomList = useAddBookToCustomList();
  const { upload, isUploading } = useFileUpload();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLibraryTab, setActiveLibraryTab] = useState<'my_library' | 'all_books'>('my_library');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>('none');
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

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClubBookIds = useMemo(() => {
    return schedule.filter(s => s.status === 'active').map(s => s.book_id);
  }, [schedule]);

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

    if (!user) {
      toast.error('Kitap eklemek için giriş yapmalısınız');
      return;
    }

    try {
      let finalCoverUrl = newBook.cover_url || `https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop&t=${Date.now()}`;
      let finalEpubUrl = null;

      // Upload cover file if selected
      if (coverFile) {
        const uploadedCoverUrl = await upload('covers', coverFile, user.id);
        if (uploadedCoverUrl) {
          finalCoverUrl = uploadedCoverUrl;
        }
      }

      // Upload epub file if selected
      if (epubFile) {
        const uploadedEpubUrl = await upload('book-files', epubFile);
        if (uploadedEpubUrl) {
          finalEpubUrl = uploadedEpubUrl;
        }
      }

      // TODO: 'books' tablosunda 'publisher' adında ayrı bir sütun bulunmuyor.
      // Şimdilik description içine string birleştirme yapıyoruz. İleride DB migration eklenecek.
      const descriptionPayload = newBook.publisher
        ? (newBook.description ? newBook.description + '\n\nYayınevi: ' + newBook.publisher : 'Yayınevi: ' + newBook.publisher)
        : newBook.description || null;

      const payload = {
        title: newBook.title,
        author: newBook.author,
        page_count: parseInt(newBook.pages),
        genre: newBook.genre || null,
        description: descriptionPayload,
        cover_url: finalCoverUrl,
        epub_url: finalEpubUrl,
        added_by: user.id,
      };

      let createdBook = await addBook.mutateAsync(payload);

      // Add to selected destination list (skip if 'none')
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

  if (isLoading) {
    return (
      <div className="px-4 pt-6 pb-24 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-24 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-serif font-bold text-foreground">
          Kütüphane
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Kitap koleksiyonunuzu yönetin
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-5">
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => setActiveLibraryTab('my_library')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${activeLibraryTab === 'my_library' ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Kütüphanem
          </button>
          <button
            onClick={() => setActiveLibraryTab('all_books')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${activeLibraryTab === 'all_books' ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Tüm Kitaplar
            </span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeLibraryTab === 'my_library' ? 'Listelerde kitap ara...' : 'Tüm kitaplarda ara...'}
            className="pl-9"
          />
        </div>

        {activeLibraryTab === 'my_library' ? (
          <MyLibrarySection searchQuery={searchQuery} />
        ) : (
          <div>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-4">Tüm Kitaplar</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredBooks.map((book) => (
                <div key={book.id} className="relative h-full flex flex-col">
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
            {filteredBooks.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center py-16 bg-card rounded-2xl border border-border/40 shadow-card flex flex-col items-center mt-4 col-span-2"
              >
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-medium mb-1">Kitap bulunamadı</p>
                <p className="text-muted-foreground text-sm max-w-[250px]">Arama kriterinize uygun kitap yok veya henüz kütüphanenize kitap eklemediniz.</p>
              </motion.div>
            )}
          </div>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setIsFormVisible(false); }}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-elevated"
              size="icon"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
                    className="w-full h-14 rounded-xl text-base shadow-sm"
                    onClick={() => setIsSearchDialogOpen(true)}
                  >
                    <Search className="w-5 h-5 mr-3" />
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
                            {/* Blur/Glow Shadow */}
                            <div className="absolute inset-0 -z-10 translate-y-4 scale-95 opacity-40 blur-2xl">
                              <img src={coverPreview} alt="" className="w-full h-full object-cover rounded-2xl" />
                            </div>
                            <img src={coverPreview} alt="Kapak" className="relative w-full h-auto object-cover aspect-[2/3] rounded-2xl shadow-elevated border border-border/20" />
                          </>
                        ) : (
                          <div className="w-full aspect-[2/3] bg-muted/40 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-border/60 text-muted-foreground/50 hover:bg-muted/60 transition-colors">
                            <Image className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium">Kapak Yok</span>
                          </div>
                        )}
                        <label className="absolute -bottom-3 -right-3 cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
                          <div className="bg-primary text-primary-foreground p-2.5 rounded-full shadow-elevated hover:bg-primary/90 transition-transform active:scale-95 text-xs flex items-center gap-1.5 font-medium">
                            <Upload className="w-4 h-4" />
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Input Fields - Premium Styling */}
                      <div className="space-y-1">
                        <Label htmlFor="title" className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Kitap Adı *</Label>
                        <Input id="title" placeholder="Kitap adını girin..." value={newBook.title}
                          onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                          className="h-auto py-2 bg-transparent border-0 border-b border-border/40 focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-1 text-foreground text-lg font-serif font-medium placeholder:text-muted-foreground/40 transition-colors" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="author" className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Yazar *</Label>
                          <Input id="author" placeholder="Yazar adını girin..." value={newBook.author}
                            onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                            className="h-auto py-2 bg-transparent border-0 border-b border-border/40 focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-1 text-foreground text-base font-medium placeholder:text-muted-foreground/40 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="publisher" className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Yayınevi</Label>
                          <Input id="publisher" placeholder="Yayınevi..." value={newBook.publisher}
                            onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                            className="h-auto py-2 bg-transparent border-0 border-b border-border/40 focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-1 text-foreground text-base font-medium placeholder:text-muted-foreground/40 transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="pages" className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Sayfa *</Label>
                          <Input id="pages" type="number" placeholder="0" value={newBook.pages}
                            onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })}
                            className="h-auto py-2 bg-transparent border-0 border-b border-border/40 focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-1 text-foreground text-base font-medium placeholder:text-muted-foreground/40 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="genre" className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Tür</Label>
                          <Input id="genre" placeholder="Örn: Roman..." value={newBook.genre}
                            onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
                            className="h-auto py-2 bg-transparent border-0 border-b border-border/40 focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-1 text-foreground text-base font-medium placeholder:text-muted-foreground/40 transition-colors" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="description" className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Açıklama</Label>
                        <Textarea id="description" placeholder="Kitap hakkında kısa açıklama..." value={newBook.description}
                          onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                          className="mt-1 bg-transparent border border-border/40 focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-xl resize-none min-h-24 text-sm px-3 py-2 placeholder:text-muted-foreground/40 transition-colors" />
                      </div>

                      {/* EPUB Upload - Ghost/Outline */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">EPUB Dosyası (İsteğe Bağlı)</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-muted/30 rounded-xl border border-border/40">
                            <BookText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate select-none flex-1">
                              {epubFile ? epubFile.name : 'Dosya seçilmedi'}
                            </span>
                          </div>
                          <label>
                            <input type="file" accept=".epub" className="hidden" onChange={handleEpubFileChange} />
                            <div className="flex items-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-xl cursor-pointer hover:bg-primary/5 transition-colors text-sm font-medium shrink-0 shadow-sm">
                              <Upload className="w-3.5 h-3.5" />
                              {epubFile ? 'Değiştir' : 'Yükle'}
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Destination Selection */}
                      <div className="space-y-1 pb-2">
                        <Label className="text-xs text-muted-foreground ml-1 uppercase tracking-wider">Nereye Eklensin?</Label>
                        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                          <SelectTrigger className="mt-1 h-12 bg-muted/40 border-0 rounded-xl shadow-sm">
                            <SelectValue placeholder="Liste seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">➖ Hiçbir yere ekleme</SelectItem>
                            <SelectItem value="want_to_read">📚 Okumak İstiyorum</SelectItem>
                            <SelectItem value="reading">📖 Okuyorum</SelectItem>
                            <SelectItem value="read">✅ Okudum</SelectItem>
                            <SelectItem value="dnf">❌ Yarıda Bıraktım</SelectItem>
                            {userLists
                              .filter(l => !l.is_default && !l.is_community)
                              .map(list => (
                                <SelectItem key={list.id} value={list.id}>
                                  📋 {list.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={handleAddBook}
                        className="w-full h-12 rounded-xl font-semibold mt-2 shadow-elevated"
                        disabled={addBook.isPending || addToDefaultList.isPending || isUploading || !user}
                      >
                        {!user ? 'Giriş yapmalısınız' : (addBook.isPending || addToDefaultList.isPending || isUploading) ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ekleniyor...</>
                        ) : 'Kütüphaneye Ekle'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DialogContent>
        </Dialog>

        {/* Combined Book Search Dialog */}
        <CombinedBookSearchDialog
          open={isSearchDialogOpen}
          onOpenChange={setIsSearchDialogOpen}
          onSelectBook={handleBookFromSearch}
        />
      </div>
    </div>
  );
};

export default LibraryTab;
