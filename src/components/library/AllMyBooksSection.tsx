import { useState, useMemo } from 'react';
import { useBooks } from '@/hooks/useBooks';
import { useUserBooks } from '@/hooks/useUserBooks';
import { useAuth } from '@/contexts/AuthContext';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import BookCard from '@/components/BookCard';
import { BookOpen, Search } from 'lucide-react';

interface AllMyBooksSectionProps {
  searchQuery: string;
}

const AllMyBooksSection = ({ searchQuery }: AllMyBooksSectionProps) => {
  const { user } = useAuth();
  const { data: allBooks = [] } = useBooks();
  const { data: userBooks = [] } = useUserBooks(user?.id);
  const { data: schedule = [] } = useClubSchedule();

  const activeClubBookIds = useMemo(() => {
    return schedule.filter(s => s.status === 'active').map(s => s.book_id);
  }, [schedule]);

  const myLibraryBooks = useMemo(() => {
    if (!user) return [];
    
    // Yazarın bizzat eklediği kitaplar veya user_books içinde olanlar
    const myBookIds = new Set(userBooks.map(ub => ub.book_id));
    
    return allBooks.filter(book => 
      book.added_by === user.id || myBookIds.has(book.id)
    );
  }, [allBooks, userBooks, user]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return myLibraryBooks.filter(book => 
      book.title.toLowerCase().includes(q) || 
      book.author.toLowerCase().includes(q)
    );
  }, [myLibraryBooks, searchQuery]);

  if (filteredBooks.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl border border-border/40 shadow-soft">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">Kitap Bulunamadı</h3>
        <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
          {searchQuery 
            ? 'Aramanızla eşleşen kitap bulunamadı.' 
            : 'Henüz kişisel kütüphanenize kitap eklemediniz.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {filteredBooks.map((book) => (
          <div key={book.id} className="relative h-full flex flex-col group">
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllMyBooksSection;
