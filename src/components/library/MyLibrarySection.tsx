import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, BookOpen, Clock, Check, X, List, Loader2, Trash2, MoreVertical } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useBookLists, useCreateBookList, useBookListItems, BookList } from '@/hooks/useBookLists';
import { Book, useDeleteBook } from '@/hooks/useBooks';
import { supabase } from '@/integrations/supabase/client';
import { useRemoveBookFromList } from '@/hooks/useBookListActions';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import { useAuth } from '@/contexts/AuthContext';
import BookCard from '@/components/BookCard';
import { BookListSkeleton } from '@/components/ui/book-skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const listTypeIcons: Record<string, React.ReactNode> = {
  want_to_read: <BookOpen className="w-4 h-4" />,
  reading: <Clock className="w-4 h-4" />,
  read: <Check className="w-4 h-4" />,
  dnf: <X className="w-4 h-4" />,
  custom: <List className="w-4 h-4" />,
};

// ─── VibeBookshelf: mood tags ──────────────────────────────────────────────
const MOOD_TAGS: { key: string; label: string; emoji: string; classes: string }[] = [
  { key: 'huzurlu', label: 'Huzurlu', emoji: '🌿', classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  { key: 'ilham', label: 'İlham Verici', emoji: '✨', classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { key: 'melankolik', label: 'Melankolik', emoji: '🌧', classes: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300' },
  { key: 'surukleyici', label: 'Sürükleyici', emoji: '🌊', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { key: 'dusundur', label: 'Düşündürücü', emoji: '💭', classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
];

const MOOD_LS_KEY = (bookId: string) => `vibe_mood_${bookId}`;

const BookMoodTag = ({ bookId }: { bookId: string }) => {
  const initial = typeof window !== 'undefined' ? localStorage.getItem(MOOD_LS_KEY(bookId)) : null;
  const [mood, setMood] = useState<string | null>(initial);

  const handleMood = (key: string) => {
    const next = mood === key ? null : key;
    setMood(next);
    if (next) localStorage.setItem(MOOD_LS_KEY(bookId), next);
    else localStorage.removeItem(MOOD_LS_KEY(bookId));
  };

  const activeMood = MOOD_TAGS.find(m => m.key === mood);

  return (
    <div className="px-1">
      {activeMood ? (
        <button
          onClick={() => handleMood(activeMood.key)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${activeMood.classes}`}
        >
          <span>{activeMood.emoji}</span>
          <span>{activeMood.label}</span>
        </button>
      ) : (
        <div className="flex flex-wrap gap-1">
          {MOOD_TAGS.map(tag => (
            <button
              key={tag.key}
              onClick={() => handleMood(tag.key)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors duration-200"
              title={tag.label}
            >
              {tag.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
// ───────────────────────────────────────────────────────────────────────────

interface MyLibrarySectionProps {
  searchQuery: string;
}

const MyLibrarySection = ({ searchQuery }: MyLibrarySectionProps) => {
  const { user, profile } = useAuth();
  const { data: allLists = [], isLoading } = useBookLists(user?.id);

  const createList = useCreateBookList();

  const [selectedListId, setSelectedListId] = useState<string | null>(() => {
    return sessionStorage.getItem('MyLib_selectedListId');
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const handleListToggle = (id: string) => {
    const nextId = selectedListId === id ? null : id;
    setSelectedListId(nextId);
    if (nextId) sessionStorage.setItem('MyLib_selectedListId', nextId);
    else sessionStorage.removeItem('MyLib_selectedListId');
  };

  const myLists = allLists.filter(list => !list.is_community);

  // Deduplicate default lists by list_type to handle potential DB duplicates
  // Priority given to the list matching the user's current group_code
  const defaultLists = myLists
    .filter(list => list.is_default)
    .sort((a, b) => {
      if (a.group_code === profile?.group_code && b.group_code !== profile?.group_code) return -1;
      if (b.group_code === profile?.group_code && a.group_code !== profile?.group_code) return 1;
      // Further prioritize newer lists if both match or neither matches
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .reduce((acc, current) => {
      if (!acc.find(item => item.list_type === current.list_type)) {
        acc.push(current);
      }
      return acc;
    }, [] as typeof allLists);

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
      <div className="space-y-6 animate-pulse">
        {/* Skeleton for Default Lists */}
        <div>
          <div className="h-4 bg-muted rounded w-32 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-[56px] bg-muted rounded-xl border-2 border-border" />
            ))}
          </div>
        </div>
        {/* Skeleton for Custom Lists */}
        <div>
          <div className="h-4 bg-muted rounded w-32 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map(i => (
              <div key={i} className="h-[56px] bg-muted rounded-xl border-2 border-border" />
            ))}
          </div>
        </div>
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
              onClick={() => handleListToggle(list.id)}
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
                onClick={() => handleListToggle(list.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected List Books */}
      {selectedListId && (
        <ListBooksView
          listId={selectedListId}
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
  const bookCount = list.book_list_items?.[0]?.count || 0;

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
  searchQuery: string;
}

const ListBooksView = ({ listId, searchQuery }: ListBooksViewProps) => {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useBookListItems(listId);
  const removeFromList = useRemoveBookFromList();
  const deleteBook = useDeleteBook();
  const { data: schedule = [] } = useClubSchedule();

  // Fetch ALL books that are in this list (including club books)
  const queryKeySuffix = useMemo(() => {
    return items.map(item => item.book_id).sort().join(',');
  }, [items]);

  const bookIds = useMemo(() => items.map(item => item.book_id), [items]);

  const { data: listBooks = [] } = useQuery({
    queryKey: ['books', 'by-ids', queryKeySuffix],
    queryFn: async () => {
      if (bookIds.length === 0) return [];
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .in('id', bookIds);
      if (error) throw error;
      return data as Book[];
    },
    enabled: bookIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const filteredBooks = listBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClubBookIds = schedule.filter(s => s.status === 'active').map(s => s.book_id);

  if (isLoading) {
    return (
      <div className="mt-8">
        <BookListSkeleton count={4} />
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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {filteredBooks.map(book => {
        const listItem = items.find(item => item.book_id === book.id);
        const isOwner = book.added_by === user?.id;

        return (
          <div key={book.id} className="relative flex flex-col gap-2 h-full">
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
              className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform duration-500 flex-1 overflow-hidden"
            />

            {/* VibeBookshelf: His Etiketi */}
            <BookMoodTag bookId={book.id} />

            {/* Options Menu */}
            <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all shadow-sm">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {listItem && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                          <List className="w-4 h-4 mr-2" />
                          Listeden Kaldır
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Kitabı Kaldır</AlertDialogTitle>
                          <AlertDialogDescription>
                            &ldquo;{book.title}&rdquo; kitabını bu listeden kaldırmak istediğinize emin misiniz?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
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
                            Kaldır
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Tamamen Sil
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tamamen Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            &ldquo;{book.title}&rdquo; kitabını kütüphaneden tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteBook.mutate(book.id, {
                                onSuccess: () => toast.success('Kitap tamamen silindi'),
                                onError: () => toast.error('Silinirken hata oluştu'),
                              });
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MyLibrarySection;
