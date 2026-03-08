import { useState } from 'react';
import { BookOpen, Users, Loader2, Plus, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClubBooks } from '@/hooks/useBooks';
import { useAddBookToDefaultList } from '@/hooks/useBookListActions';
import BookCard from '@/components/BookCard';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClubLibrarySectionProps {
    searchQuery: string;
}

const ClubLibrarySection = ({ searchQuery }: ClubLibrarySectionProps) => {
    const { user } = useAuth();
    const { data: clubBooks = [], isLoading } = useClubBooks();
    const addToDefaultList = useAddBookToDefaultList();

    const filteredBooks = clubBooks.filter(
        (book) =>
            book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToMyLibrary = async (bookId: string, listType: 'want_to_read' | 'reading' | 'read') => {
        if (!user) {
            toast.error('Giriş yapmalısınız');
            return;
        }

        try {
            await addToDefaultList.mutateAsync({ bookId, listType });
            const listNames = {
                want_to_read: 'Okumak İstiyorum',
                reading: 'Şu An Okuyor',
                read: 'Okudum',
            };
            toast.success(`Kitap "${listNames[listType]}" listesine eklendi!`);
        } catch (error) {
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1 rounded-lg">
                                    <Plus className="w-3.5 h-3.5" />
                                    Kütüphaneme Ekle
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-48">
                                <DropdownMenuItem onClick={() => handleAddToMyLibrary(book.id, 'reading')}>
                                    Şu An Okuyor
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddToMyLibrary(book.id, 'want_to_read')}>
                                    Okumak İstiyorum
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddToMyLibrary(book.id, 'read')}>
                                    Okudum
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ClubLibrarySection;
