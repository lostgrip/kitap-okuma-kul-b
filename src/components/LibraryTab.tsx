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
  const [activeLibraryTab, setActiveLibraryTab] = useState<'my_library' | 'all_books'>(() => {
    return (sessionStorage.getItem('activeLibraryTab') as 'my_library' | 'all_books') || 'my_library';
  });
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
    <>
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
            onClick={() => {
              setActiveLibraryTab('my_library');
              sessionStorage.setItem('activeLibraryTab', 'my_library');
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${activeLibraryTab === 'my_library' ? 'bg-background text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Kütüphanem
          </button>
          <button
            onClick={() => {
              setActiveLibraryTab('all_books');
              sessionStorage.setItem('activeLibraryTab', 'all_books');
            }}
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
      </div>
    </div>

    {/* FAB + Dialogs outside animated container */}
    <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setIsFormVisible(false); }}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 rounded-full shadow-elevated z-40"
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
