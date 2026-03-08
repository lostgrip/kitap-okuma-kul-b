import { Users, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClubBooks } from '@/hooks/useBooks';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BookCard from '@/components/BookCard';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ClubLibrarySectionProps {
    searchQuery: string;
}

const ClubLibrarySection = ({ searchQuery }: ClubLibrarySectionProps) => {
    const { user } = useAuth();
    const { data: clubBooks = [], isLoading } = useClubBooks();
    const queryClient = useQueryClient();

    const filteredBooks = clubBooks.filter(
        (book) =>
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToLibrary = async (bookId: string) => {
        if (!user) {
            toast.error('Giriş yapmalısınız');
            return;
        }

        try {
            // Check if already in user's library
            const { data: existing } = await supabase
                .from('user_books')
                .select('id')
                .eq('user_id', user.id)
                .eq('book_id', bookId)
                .maybeSingle();

            if (existing) {
                toast.info('Bu kitap zaten kütüphanenizde');
                return;
            }

            // 1. Add to user_books
            const { error } = await supabase
                .from('user_books')
                .insert({ user_id: user.id, book_id: bookId, status: 'want_to_read' });
            if (error) throw error;

            // 2. Find user's "Okumak İstiyorum" list and add book there too
            const { data: wantList } = await supabase
                .from('book_lists')
                .select('id')
                .eq('user_id', user.id)
                .eq('list_type', 'want_to_read')
                .eq('is_default', true)
                .maybeSingle();

            if (wantList) {
                await supabase
                    .from('book_list_items')
                    .insert({ list_id: wantList.id, book_id: bookId });
            }

            // 3. Create reading_progress entry
            await supabase
                .from('reading_progress')
                .insert({ user_id: user.id, book_id: bookId, status: 'want_to_read', current_page: 0 });

            queryClient.invalidateQueries({ queryKey: ['user-books'] });
            queryClient.invalidateQueries({ queryKey: ['book-list-items'] });
            queryClient.invalidateQueries({ queryKey: ['reading-progress'] });
            toast.success('Kitap "Okumak İstiyorum" listenize eklendi!');
        } catch {
            toast.error('Kitap eklenirken hata oluştu');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (filteredBooks.length === 0) {
        return (
            <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Kulüp kütüphanesinde kitap bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            {filteredBooks.map((book) => (
                <div key={`club-book-${book.id}`} className="flex flex-col h-full bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden group hover:border-border/80 transition-all">
                    <BookCard book={book} size="md" />
                    <div className="p-3 pt-0 mt-auto flex flex-col gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8 gap-1 rounded-lg"
                            onClick={() => handleAddToLibrary(book.id)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Kütüphaneye Ekle
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClubLibrarySection;
