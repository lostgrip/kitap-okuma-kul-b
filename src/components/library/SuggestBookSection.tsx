import { motion } from 'framer-motion';
import { Loader2, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClubBookSuggestions, useUpdateClubBookSuggestion } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { toast } from 'sonner';

const SuggestBookSection = () => {
  const { user } = useAuth();
  const { data: suggestions = [], isLoading, isError } = useClubBookSuggestions();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const updateSuggestion = useUpdateClubBookSuggestion();

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
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 mt-8">
        <XCircle className="w-8 h-8 text-red-500" />
        <p className="text-red-800 dark:text-red-300 font-medium">Öneriler yüklenemedi.</p>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 max-w-[280px]">
          Lütfen veritabanı kurulumlarının (migration) tamamlandığından emin olun.
        </p>
      </div>
    );
  }

  // Sadece ilgili kullanıcı eklediyse VEYA admin ise görsün mu? 
  // Şimdilik herkes tüm önerileri görsün.
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-4 mt-12 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h3 className="font-serif text-lg font-semibold">Önerilen Kitaplar</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-card rounded-xl p-4 border border-border/40 shadow-sm flex gap-4 transition-all hover:shadow-md">
            {suggestion.cover_url ? (
              <img src={suggestion.cover_url} alt={suggestion.title} loading="lazy" decoding="async" className="w-16 h-24 object-cover rounded shadow-sm" />
            ) : (
              <div className="w-16 h-24 bg-muted/50 rounded flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              <h4 className="font-medium text-foreground text-sm line-clamp-2">{suggestion.title}</h4>
              <p className="text-xs text-muted-foreground truncate mt-1">{suggestion.author}</p>
              
              <div className="mt-auto pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {suggestion.status === 'pending' && <span className="flex items-center text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full"><Clock className="w-3 h-3 mr-1"/> Bekliyor</span>}
                  {suggestion.status === 'approved' && <span className="flex items-center text-[10px] font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> Onaylandı</span>}
                  {suggestion.status === 'rejected' && <span className="flex items-center text-[10px] font-medium text-red-600 bg-red-500/10 px-2.5 py-1 rounded-full"><XCircle className="w-3 h-3 mr-1"/> Reddedildi</span>}
                </div>

                {isAdmin && suggestion.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full" onClick={() => handleStatusChange(suggestion.id, 'approved')}>
                      <CheckCircle className="w-4 h-4" />
                      <span className="sr-only">Onayla</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => handleStatusChange(suggestion.id, 'rejected')}>
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
