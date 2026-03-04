import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBookLists } from './useBookLists';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to add a book to a user's default list by type (want_to_read, reading, read, dnf).
 * Also syncs the user_books table for status tracking.
 */
export const useAddBookToDefaultList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: lists = [] } = useBookLists(user?.id);

  return useMutation({
    mutationFn: async ({ bookId, listType }: { bookId: string; listType: 'want_to_read' | 'reading' | 'read' | 'dnf' }) => {
      if (!user) throw new Error('Not authenticated');

      // Find the user's default list for this type
      const targetList = lists.find(l => l.is_default && l.list_type === listType && !l.is_community);
      if (!targetList) throw new Error(`Default list "${listType}" not found`);

      // Remove from other default lists first (a book can only be in one status)
      const otherDefaultLists = lists.filter(l => l.is_default && !l.is_community && l.id !== targetList.id);
      for (const dl of otherDefaultLists) {
        await supabase
          .from('book_list_items')
          .delete()
          .eq('list_id', dl.id)
          .eq('book_id', bookId);
      }

      // Add to target list using upsert safely (checking if it already exists could also work, but upsert is cleaner if we had a unique id. Since we don't know the item id, we might violate uniqueness if we just insert. We will do a safe insert by first checking)
      const { data: existing } = await supabase
        .from('book_list_items')
        .select('id')
        .eq('list_id', targetList.id)
        .eq('book_id', bookId)
        .single();

      if (!existing) {
        const { error: itemError } = await supabase
          .from('book_list_items')
          .insert({ list_id: targetList.id, book_id: bookId });
        if (itemError) console.error("Error inserting into book_list_items:", itemError);
      }

      // Also sync user_books table
      const statusMap: Record<string, string> = {
        want_to_read: 'want_to_read',
        reading: 'reading',
        read: 'read',
        dnf: 'dnf',
      };

      const { error: ubError } = await supabase
        .from('user_books')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          status: statusMap[listType],
          started_at: listType === 'reading' ? new Date().toISOString() : undefined,
          completed_at: listType === 'read' ? new Date().toISOString() : undefined,
        }, { onConflict: 'user_id,book_id' });

      if (ubError) throw ubError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['user_books'] });
    },
  });
};

/**
 * Hook to add a book to a custom or community list.
 */
export const useAddBookToCustomList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, bookId }: { listId: string; bookId: string }) => {
      const { error } = await supabase
        .from('book_list_items')
        .insert({ list_id: listId, book_id: bookId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
    },
  });
};

/**
 * Hook to remove a book from a specific list.
 */
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
      queryClient.invalidateQueries({ queryKey: ['user_books'] });
    },
  });
};

/**
 * Hook to approve a book into a community list from its shadow pending list.
 */
export const useApproveCommunityListItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pendingListId, targetListId, bookId }: { pendingListId: string; targetListId: string; bookId: string }) => {
      // Add to target list
      const { error: insertError } = await supabase
        .from('book_list_items')
        .insert({ list_id: targetListId, book_id: bookId });

      if (insertError) throw insertError;

      // Remove from pending list
      const { error: deleteError } = await supabase
        .from('book_list_items')
        .delete()
        .eq('list_id', pendingListId)
        .eq('book_id', bookId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
    },
  });
};

/**
 * Hook to reject a book from a community list (delete from shadow list).
 */
export const useRejectCommunityListItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pendingListId, bookId }: { pendingListId: string; bookId: string }) => {
      const { error } = await supabase
        .from('book_list_items')
        .delete()
        .eq('list_id', pendingListId)
        .eq('book_id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
    },
  });
};
