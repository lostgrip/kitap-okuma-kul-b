import { useState, useMemo } from 'react';
import { Plus, Search, BookOpen, Loader2, Upload, Image, Trash2, BookText } from 'lucide-react';
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
  const [selectedDestination, setSelectedDestination] = useState<string>('none');
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
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-6 pb-24 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-foreground">
          Kütüphane
        </h1>
        <p className="text-muted-foreground mt-1">
          Kitap koleksiyonunuzu yönetin
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-12">
        <MyLibrarySection searchQuery={searchQuery} />

        {/* All Books Section */}
        <div>
          <h2 className="text-xl font-serif font-semibold text-foreground mb-4">
            Tüm Kitaplar
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
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
                  isClubBook={activeClubBookIds.includes(book.id)}
                  className="bg-card p-3 rounded-xl shadow-soft"
                />
                {/* Admin or owner can delete */}
                {(isAdmin || book.added_by === user?.id) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="absolute top-2 right-2 w-7 h-7 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive transition-colors z-10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                )}
              </div>
            ))}
          </div>
          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Kitap bulunamadı</p>
            </div>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-elevated"
              size="icon"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                Yeni Kitap Ekle
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Search from combined sources */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsSearchDialogOpen(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Kitap Ara
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    veya manuel ekle
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium">Kitap Adı *</Label>
                <Input id="title" placeholder="Kitap adını girin..." value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="author" className="text-sm font-medium">Yazar *</Label>
                <Input id="author" placeholder="Yazar adını girin..." value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="publisher" className="text-sm font-medium">Yayınevi</Label>
                <Input id="publisher" placeholder="Yayınevi bilgisini girin..." value={newBook.publisher}
                  onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                  className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="pages" className="text-sm font-medium">Toplam Sayfa *</Label>
                <Input id="pages" type="number" placeholder="Sayfa sayısını girin..." value={newBook.pages}
                  onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })}
                  className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="genre" className="text-sm font-medium">Tür</Label>
                <Input id="genre" placeholder="Roman, Bilim Kurgu, vb..." value={newBook.genre}
                  onChange={(e) => setNewBook({ ...newBook, genre: e.target.value })}
                  className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
              </div>

              {/* Cover Upload */}
              <div>
                <Label className="text-sm font-medium">Kapak Resmi</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Kapak" className="w-16 h-24 object-cover rounded-lg border-2 border-border" />
                  ) : (
                    <div className="w-16 h-24 bg-muted rounded-lg flex items-center justify-center border-2 border-border">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <label className="flex-1">
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl cursor-pointer hover:bg-accent transition-colors text-sm font-medium">
                      <Upload className="w-4 h-4" />
                      {coverFile ? 'Değiştir' : 'Kapak Yükle'}
                    </div>
                  </label>
                </div>
              </div>

              {/* EPUB Upload */}
              <div>
                <Label className="text-sm font-medium">EPUB Dosyası (İsteğe Bağlı)</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl border-2 border-transparent">
                    <BookText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate select-none flex-1">
                      {epubFile ? epubFile.name : 'Dosya seçilmedi'}
                    </span>
                  </div>
                  <label>
                    <input type="file" accept=".epub" className="hidden" onChange={handleEpubFileChange} />
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl cursor-pointer hover:bg-primary/90 transition-colors text-sm font-medium shrink-0">
                      <Upload className="w-4 h-4" />
                      {epubFile ? 'Değiştir' : 'Yükle'}
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Açıklama</Label>
                <Textarea id="description" placeholder="Kitap hakkında kısa açıklama..." value={newBook.description}
                  onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  className="mt-1.5 bg-muted border-0 rounded-xl resize-none min-h-20" />
              </div>

              {/* Destination Selection */}
              <div>
                <Label className="text-sm font-medium">Nereye Eklensin?</Label>
                <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                  <SelectTrigger className="mt-1.5 h-12 bg-muted border-0 rounded-xl">
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
                className="w-full h-12 rounded-xl font-semibold mt-2"
                disabled={addBook.isPending || addToDefaultList.isPending || isUploading || !user}
              >
                {!user ? 'Giriş yapmalısınız' : (addBook.isPending || addToDefaultList.isPending || isUploading) ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ekleniyor...</>
                ) : 'Kütüphaneye Ekle'}
              </Button>
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
