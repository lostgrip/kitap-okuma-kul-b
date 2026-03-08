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

    const handleAddToAllBooks = async (bookId: string) => {
        if (!user) {
            toast.error('Giriş yapmalısınız');
            return;
        }

        try {
            const { error } = await supabase
                .from('books')
                .update({ club_status: null })
                .eq('id', bookId);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['books'] });
            queryClient.invalidateQueries({ queryKey: ['club-books'] });
            toast.success('Kitap Tüm Kitaplar\'a eklendi!');
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
                            onClick={() => handleAddToAllBooks(book.id)}
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
