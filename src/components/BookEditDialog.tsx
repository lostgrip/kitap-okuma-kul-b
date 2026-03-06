import { useState, useEffect } from 'react';
import { Loader2, Upload, Image, Search, BookText, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateBook, Book } from '@/hooks/useBooks';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CombinedBookSearchDialog from './CombinedBookSearchDialog';

interface BookEditDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookEditDialog = ({ book, open, onOpenChange }: BookEditDialogProps) => {
  const { user } = useAuth();
  const updateBook = useUpdateBook();
  const { upload: uploadCover, isUploading: isCoverUploading } = useFileUpload();
  const { upload: uploadEpub, isUploading: isEpubUploading, uploadProgress: epubProgress } = useFileUpload();
  const [searchOpen, setSearchOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [epubFileName, setEpubFileName] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    page_count: 0,
    genre: '',
    description: '',
    publisher: '',
    cover_url: '',
    epub_url: '',
  });

  useEffect(() => {
    if (open && book) {
      const publisherMatch = book.description?.match(/Yayınevi:\s*(.+)$/);
      const parsedPublisher = publisherMatch ? publisherMatch[1] : '';
      const parsedDescription = book.description
        ? book.description.replace(/\n\nYayınevi:\s*.+$/, '').replace(/Yayınevi:\s*.+$/, '')
        : '';

      setForm({
        title: book.title,
        author: book.author,
        publisher: parsedPublisher,
        page_count: book.page_count,
        genre: book.genre || '',
        description: parsedDescription,
        cover_url: book.cover_url || '',
        epub_url: book.epub_url || '',
      });
      setCoverPreview(book.cover_url);
      setCoverFile(null);
      setEpubFileName(null);
    }
  }, [open, book]);

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Upload EPUB immediately on file selection
  const handleEpubFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEpubFileName(file.name);

    const uploadedUrl = await uploadEpub('book-files', file);
    if (uploadedUrl) {
      setForm(prev => ({ ...prev, epub_url: uploadedUrl }));
      toast.success('EPUB dosyası yüklendi! ✅');
    } else {
      setEpubFileName(null);
    }
  };

  const handleSearchSelect = (searchBook: { title: string; author: string; pages: number; cover_url: string | null; genre: string | null; description: string | null; publisher: string | null }) => {
    setForm({
      title: searchBook.title,
      author: searchBook.author,
      publisher: searchBook.publisher || '',
      page_count: searchBook.pages,
      genre: searchBook.genre || '',
      description: searchBook.description || '',
      cover_url: searchBook.cover_url || '',
      epub_url: form.epub_url,
    });
    setCoverPreview(searchBook.cover_url);
    setCoverFile(null);
    setSearchOpen(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.author) {
      toast.error('Başlık ve yazar zorunludur');
      return;
    }

    try {
      let finalCoverUrl = form.cover_url;

      if (coverFile && user) {
        const uploadedCoverUrl = await uploadCover('covers', coverFile, user.id);
        if (uploadedCoverUrl) finalCoverUrl = uploadedCoverUrl;
      }

      const descriptionPayload = form.publisher
        ? (form.description ? form.description + '\n\nYayınevi: ' + form.publisher : 'Yayınevi: ' + form.publisher)
        : form.description || null;

      await updateBook.mutateAsync({
        id: book.id,
        title: form.title,
        author: form.author,
        page_count: form.page_count,
        genre: form.genre || null,
        description: descriptionPayload,
        cover_url: finalCoverUrl || null,
        epub_url: form.epub_url || null,
      });

      toast.success('Kitap güncellendi!');
      onOpenChange(false);
    } catch {
      toast.error('Güncelleme sırasında hata oluştu');
    }
  };

  const isAnythingUploading = isCoverUploading || isEpubUploading;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!isAnythingUploading) onOpenChange(v); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Kitabı Düzenle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Button variant="outline" className="w-full" onClick={() => setSearchOpen(true)}>
              <Search className="w-4 h-4 mr-2" />
              Doğru bilgileri ara ve doldur
            </Button>

            <div>
              <Label className="text-sm font-medium">Kitap Adı *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">Yazar *</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">Yayınevi</Label>
              <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">Sayfa Sayısı</Label>
              <Input type="number" value={form.page_count} onChange={(e) => setForm({ ...form, page_count: parseInt(e.target.value) || 0 })}
                className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-medium">Tür</Label>
              <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>

            {/* Cover */}
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
                    {coverFile ? 'Değiştir' : 'Yeni Kapak Yükle'}
                  </div>
                </label>
              </div>
            </div>

            {/* EPUB Upload */}
            <div>
              <Label className="text-sm font-medium">EPUB Dosyası</Label>
              <div className="mt-1.5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl border-2 border-transparent">
                    {form.epub_url && !isEpubUploading ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <BookText className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm text-foreground truncate select-none flex-1">
                      {isEpubUploading
                        ? `Yükleniyor: ${epubFileName || 'dosya'}...`
                        : epubFileName
                          ? epubFileName
                          : form.epub_url
                            ? 'Mevcut Bir Dosya Yüklü ✓'
                            : 'Dosya seçilmedi'}
                    </span>
                  </div>
                  <label>
                    <input
                      type="file"
                      accept=".epub"
                      className="hidden"
                      onChange={handleEpubFileChange}
                      disabled={isEpubUploading}
                    />
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium shrink-0 transition-colors ${
                      isEpubUploading
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}>
                      <Upload className="w-4 h-4" />
                      {isEpubUploading ? 'Yükleniyor...' : form.epub_url ? 'Değiştir' : 'Yükle'}
                    </div>
                  </label>
                </div>

                {/* Upload progress bar */}
                {isEpubUploading && (
                  <div className="space-y-1">
                    <Progress value={epubProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      %{epubProgress} — Lütfen bekleyin, büyük dosyalar biraz zaman alabilir
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Maksimum dosya boyutu: 50 MB
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5 bg-muted border-0 rounded-xl resize-none min-h-20" />
            </div>

            <Button onClick={handleSave} className="w-full h-12 rounded-xl font-semibold"
              disabled={updateBook.isPending || isAnythingUploading}>
              {(updateBook.isPending || isCoverUploading) ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</>
              ) : isEpubUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />EPUB yükleniyor, bekleyin...</>
              ) : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CombinedBookSearchDialog open={searchOpen} onOpenChange={setSearchOpen} onSelectBook={handleSearchSelect} />
    </>
  );
};

export default BookEditDialog;
