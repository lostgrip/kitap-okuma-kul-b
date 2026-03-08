import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookList {
  id: string;
  user_id: string;
  group_code: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  is_community: boolean;
  is_approved: boolean;
  list_type: 'want_to_read' | 'reading' | 'read' | 'dnf' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface BookListItem {
  id: string;
  list_id: string;
  book_id: string;
  added_at: string;
}

export const useBookLists = (userId?: string) => {
  return useQuery({
    queryKey: ['book_lists', userId],
    queryFn: async () => {
      let query = supabase.from('book_lists').select('*').order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BookList[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCommunityLists = () => {
  return useQuery({
    queryKey: ['book_lists', 'community'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_lists')
        .select('*')
        .eq('is_community', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BookList[];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useBookListItems = (listId: string) => {
  return useQuery({
    queryKey: ['book_list_items', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_list_items')
        .select('*')
        .eq('list_id', listId);

      if (error) throw error;
      return data as BookListItem[];
    },
    enabled: !!listId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateBookList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (list: Omit<BookList, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('book_lists')
        .insert(list)
        .select()
        .single();

      if (error) throw error;
      return data as BookList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_lists'] });
    },
  });
};

export const useAddBookToList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, bookId }: { listId: string; bookId: string }) => {
      const { data, error } = await supabase
        .from('book_list_items')
        .insert({ list_id: listId, book_id: bookId })
        .select()
        .single();

      if (error) throw error;
      return data as BookListItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
    },
  });
};

export const useRemoveBookFromList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, bookId }: { listId: string; bookId: string }) => {
      const { error } = await supabase
        .from('book_list_items')
        .delete()
        .eq('list_id', listId)
        .eq('book_id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
    },
  });
};

export const useUpdateBookList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookList> & { id: string }) => {
      const { data, error } = await supabase
        .from('book_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BookList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_lists'] });
    },
  });
};

export const useDeleteBookList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('book_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_lists'] });
    },
  });
};

export const useBookInLists = (bookId: string) => {
  return useQuery({
    queryKey: ['book_in_lists', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_list_items')
        .select('list_id')
        .eq('book_id', bookId);

      if (error) throw error;
      return data.map(d => d.list_id);
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePendingListProposals = () => {
  return useQuery({
    queryKey: ['pending_list_proposals'],
    queryFn: async () => {
      // 1. Get shadow lists
      const { data: shadowLists, error: slError } = await supabase
        .from('book_lists')
        .select('*')
        .like('name', '[ONAY BEKLİYOR]%');

      if (slError) throw slError;
      if (!shadowLists.length) return [];

      const shadowListIds = shadowLists.map((l: any) => l.id);

      // 2. Get items in those lists with book details
      const { data: items, error: itemsError } = await supabase
        .from('book_list_items')
        .select(`
          id,
          book_id,
          list_id,
          added_at,
          book:books (*)
        `)
        .in('list_id', shadowListIds);

      if (itemsError) throw itemsError;

      // Map them to include the target list ID (from description) and original list name
      return items.map((item: any) => {
        const shadowList = shadowLists.find((l: any) => l.id === item.list_id);
        const originalName = shadowList?.name.replace('[ONAY BEKLİYOR] ', '') || 'Unknown List';
        const targetListId = shadowList?.description || ''; // We stored the target list ID here

        return {
          id: item.id,
          book_id: item.book_id,
          added_at: item.added_at,
          shadowListId: item.list_id,
          targetListId,
          originalListName: originalName,
          book: Array.isArray(item.book) ? item.book[0] : item.book
        };
      });
    },
  });
};
