import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClubBookSuggestions, useAddClubBookSuggestion, useUpdateClubBookSuggestion } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import BookSearchDialog from '../BookSearchDialog';
import { toast } from 'sonner';

const SuggestBookSection = () => {
  const { user, profile } = useAuth();
  const { data: suggestions = [], isLoading, isError } = useClubBookSuggestions();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const addSuggestion = useAddClubBookSuggestion();
  const updateSuggestion = useUpdateClubBookSuggestion();
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  const handleBookSelect = async (book: any) => {
    if (!user || !profile?.group_code) return;
    
    try {
      await addSuggestion.mutateAsync({
        user_id: user.id,
        group_code: profile.group_code,
        title: book.title,
        author: book.author,
        description: book.description || null,
        cover_url: book.cover_url || null,
      });
      toast.success('Kitap önerisi gönderildi.');
    } catch (error) {
      toast.error('Öneri gönderilirken hata oluştu.');
    } finally {
      setIsSearchDialogOpen(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateSuggestion.mutateAsync({ id, status });
      toast.success(`Öneri ${status === 'approved' ? 'onaylandı' : 'reddedildi'}.`);
    } catch {
      toast.error('İşlem başarısız.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
        <XCircle className="w-8 h-8 text-red-500" />
        <p className="text-red-800 dark:text-red-300 font-medium">Öneriler yüklenemedi.</p>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 max-w-[280px]">
          Lütfen veritabanı kurulumlarının (migration) tamamlandığından emin olun.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-5 border border-border/40 shadow-soft">
        <h3 className="font-serif text-lg font-semibold mb-2">Kulüp İçin Kitap Öner</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Kulüpte okunmasını istediğiniz kitapları buradan önerebilirsiniz. 
          Yöneticiler onayladıktan sonra kitap Kulüp Kütüphanesine eklenecektir.
        </p>
        <Button onClick={() => setIsSearchDialogOpen(true)} className="w-full sm:w-auto">
          <Search className="w-4 h-4 mr-2" />
          Kitap Ara ve Öner
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-serif text-lg font-semibold">Önerilen Kitaplar</h3>
        {suggestions.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-border/40 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>Henüz kitap önerisi yapılmamış.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-card rounded-xl p-4 border border-border/40 flex gap-4">
                {suggestion.cover_url ? (
                  <img src={suggestion.cover_url} alt={suggestion.title} loading="lazy" decoding="async" className="w-16 h-24 object-cover rounded shadow-sm" />
                ) : (
                  <div className="w-16 h-24 bg-muted/50 rounded flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 flex flex-col min-w-0">
                  <h4 className="font-medium text-foreground truncate">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{suggestion.author}</p>
                  
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {suggestion.status === 'pending' && <span className="flex items-center text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full"><Clock className="w-3 h-3 mr-1"/> Bekliyor</span>}
                      {suggestion.status === 'approved' && <span className="flex items-center text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> Onaylandı</span>}
                      {suggestion.status === 'rejected' && <span className="flex items-center text-xs text-red-500 bg-red-500/10 px-2 py-1 rounded-full"><XCircle className="w-3 h-3 mr-1"/> Reddedildi</span>}
                    </div>

                    {isAdmin && suggestion.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(suggestion.id, 'approved')}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(suggestion.id, 'rejected')}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookSearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
        onSelectBook={handleBookSelect}
      />
    </div>
  );
};

export default SuggestBookSection;
