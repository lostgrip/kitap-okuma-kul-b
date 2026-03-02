import { useState } from 'react';
import { Plus, BookOpen, Clock, Check, X, List, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { useBookLists, useCreateBookList, useBookListItems, BookList } from '@/hooks/useBookLists';
import { Book, useBooks, useDeleteBook } from '@/hooks/useBooks';
import { useRemoveBookFromList } from '@/hooks/useBookListActions';
import { useAuth } from '@/contexts/AuthContext';
import BookCard from '@/components/BookCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const listTypeIcons: Record<string, React.ReactNode> = {
  want_to_read: <BookOpen className="w-4 h-4" />,
  reading: <Clock className="w-4 h-4" />,
  read: <Check className="w-4 h-4" />,
  dnf: <X className="w-4 h-4" />,
  custom: <List className="w-4 h-4" />,
};

interface MyLibrarySectionProps {
  searchQuery: string;
}

const MyLibrarySection = ({ searchQuery }: MyLibrarySectionProps) => {
  const { user, profile } = useAuth();
  const { data: allLists = [], isLoading } = useBookLists(user?.id);
  const { data: books = [] } = useBooks();
  const createList = useCreateBookList();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const myLists = allLists.filter(list => !list.is_community);
  const defaultLists = myLists.filter(list => list.is_default);
  const customLists = myLists.filter(list => !list.is_default);

  const handleCreateList = async () => {
    if (!newListName.trim() || !user || !profile) {
      toast.error('Liste adı girin');
      return;
    }

    try {
      await createList.mutateAsync({
        user_id: user.id,
        group_code: profile.group_code,
        name: newListName,
        description: null,
        is_default: false,
        is_community: false,
        is_approved: false,
        list_type: 'custom',
      });
      setNewListName('');
      setIsCreateDialogOpen(false);
      toast.success('Liste oluşturuldu!');
    } catch (error) {
      toast.error('Liste oluşturulurken hata oluştu');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Lists */}
      <div>
        <h3 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Okuma Listeleri
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {defaultLists.map(list => (
            <ListCard
              key={list.id}
              list={list}
              isSelected={selectedListId === list.id}
              onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)}
            />
          ))}
        </div>
      </div>

      {/* Custom Lists */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Özel Listelerim
          </h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Yeni
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">Yeni Liste Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="listName">Liste Adı</Label>
                  <Input
                    id="listName"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Örn: Yaz Okumaları"
                    className="mt-1.5"
                  />
                </div>
                <Button
                  onClick={handleCreateList}
                  className="w-full"
                  disabled={createList.isPending}
                >
                  {createList.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Oluştur
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {customLists.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Henüz özel liste oluşturmadınız
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {customLists.map(list => (
              <ListCard
                key={list.id}
                list={list}
                isSelected={selectedListId === list.id}
                onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected List Books */}
      {selectedListId && (
        <ListBooksView
          listId={selectedListId}
          books={books}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
};

interface ListCardProps {
  list: BookList;
  isSelected: boolean;
  onClick: () => void;
}

const ListCard = ({ list, isSelected, onClick }: ListCardProps) => {
  const { data: items = [] } = useBookListItems(list.id);
  const bookCount = items.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl text-left transition-all w-full',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-card border-2 border-border hover:border-primary'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        isSelected ? 'bg-primary-foreground/20' : 'bg-accent'
      )}>
        {listTypeIcons[list.list_type] || <List className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{list.name}</p>
        <p className={cn(
          'text-xs',
          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {bookCount} kitap
        </p>
      </div>
    </button>
  );
};

interface ListBooksViewProps {
  listId: string;
  books: Book[];
  searchQuery: string;
}

const ListBooksView = ({ listId, books, searchQuery }: ListBooksViewProps) => {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useBookListItems(listId);
  const removeFromList = useRemoveBookFromList();
  const deleteBook = useDeleteBook();

  const listBooks = books.filter(book =>
    items.some(item => item.book_id === book.id)
  );

  const filteredBooks = listBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (filteredBooks.length === 0) {
    return (
      <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Bu listede kitap yok</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {filteredBooks.map(book => {
        const listItem = items.find(item => item.book_id === book.id);
        const isOwner = book.added_by === user?.id;

        return (
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
              className="bg-card p-3 rounded-xl shadow-soft"
            />
            {/* Remove from list */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="absolute top-2 right-2 w-7 h-7 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive transition-colors z-10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kitabı Kaldır</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{book.title}" kitabını bu listeden kaldırmak istediğinize emin misiniz?
                    {isOwner && ' Kitabı tamamen silmek isterseniz "Tamamen Sil" butonunu kullanın.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  {listItem && (
                    <AlertDialogAction
                      onClick={() => {
                        removeFromList.mutate(
                          { listId, bookId: book.id },
                          {
                            onSuccess: () => toast.success('Kitap listeden kaldırıldı'),
                            onError: () => toast.error('Kaldırılırken hata oluştu'),
                          }
                        );
                      }}
                    >
                      Listeden Kaldır
                    </AlertDialogAction>
                  )}
                  {isOwner && (
                    <AlertDialogAction
                      onClick={() => {
                        deleteBook.mutate(book.id, {
                          onSuccess: () => toast.success('Kitap tamamen silindi'),
                          onError: () => toast.error('Silinirken hata oluştu'),
                        });
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Tamamen Sil
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
};

export default MyLibrarySection;
