import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBookLists } from './useBookLists';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to add a book to a user's default list by type (want_to_read, reading, read, dnf).
 * Now syncs primarily via the reading_progress table; database triggers handle list movement.
 */
export const useAddBookToDefaultList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: lists = [] } = useBookLists(user?.id);

  return useMutation({
    mutationFn: async ({ bookId, listType }: { bookId: string; listType: 'want_to_read' | 'reading' | 'read' | 'dnf' }) => {
      if (!user) throw new Error('Not authenticated');

      const statusMap: Record<string, 'want_to_read' | 'reading' | 'completed' | 'paused'> = {
        want_to_read: 'want_to_read',
        reading: 'reading',
        read: 'completed',
        dnf: 'paused',
      };

      // We now drive the state via reading_progress.
      // The database trigger tr_sync_book_list will handle adding the book 
      // to the correct list and removing it from others.
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          status: statusMap[listType],
          started_at: listType === 'reading' ? new Date().toISOString() : undefined,
          completed_at: listType === 'read' ? new Date().toISOString() : undefined,
        }, { onConflict: 'user_id,book_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
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
      // Find list type first to know if we need to sync progress
      const { data: list } = await supabase
        .from('book_lists')
        .select('is_default, list_type')
        .eq('id', listId)
        .single();

      const { error } = await supabase
        .from('book_list_items')
        .delete()
        .eq('list_id', listId)
        .eq('book_id', bookId);

      if (error) throw error;

      // If it was a default list, it means the user is effectively "removing" the book from their tracked reading.
      // We should clear the reading_progress record to stay in sync.
      if (list && list.is_default) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('reading_progress')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', bookId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
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
