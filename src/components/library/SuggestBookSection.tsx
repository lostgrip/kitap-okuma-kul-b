import { Loader2, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePendingClubBooks, useApproveClubBook, useDeleteBook } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { toast } from 'sonner';

const SuggestBookSection = () => {
  const { user } = useAuth();
  const { data: pendingBooks = [], isLoading, isError } = usePendingClubBooks();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const approveBook = useApproveClubBook();
  const deleteBook = useDeleteBook();

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">Öneriler yüklenemedi.</p>
    );
  }

  if (pendingBooks.length === 0) return null;

  return (
    <div className="space-y-4 mt-12 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h3 className="font-serif text-lg font-semibold">Önerilen Kitaplar</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pendingBooks.map((book) => (
          <div key={book.id} className="bg-card rounded-xl p-4 border border-border/40 shadow-sm flex gap-4 transition-all hover:shadow-md">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} loading="lazy" decoding="async" className="w-16 h-24 object-cover rounded shadow-sm" />
            ) : (
              <div className="w-16 h-24 bg-muted/50 rounded flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              <h4 className="font-medium text-foreground text-sm line-clamp-2">{book.title}</h4>
              <p className="text-xs text-muted-foreground truncate mt-1">{book.author}</p>
              
              <div className="mt-auto pt-3 flex items-center justify-between">
                <span className="flex items-center text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3 mr-1"/> Bekliyor
                </span>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full"
                      onClick={async () => {
                        try {
                          await approveBook.mutateAsync(book.id);
                          toast.success(`"${book.title}" onaylandı!`);
                        } catch {
                          toast.error('Onaylama başarısız');
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="sr-only">Onayla</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                      onClick={async () => {
                        try {
                          await deleteBook.mutateAsync(book.id);
                          toast.success('Öneri reddedildi');
                        } catch {
                          toast.error('Reddetme başarısız');
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="sr-only">Reddet</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestBookSection;
