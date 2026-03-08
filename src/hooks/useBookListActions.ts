import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBookLists } from './useBookLists';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to add a book to a user's default list by type (want_to_read, reading, read, dnf).
 * Syncs both reading_progress AND book_list_items manually.
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

      // 1. Upsert reading_progress
      const { error: progressError } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          status: statusMap[listType],
          started_at: listType === 'reading' ? new Date().toISOString() : undefined,
          completed_at: listType === 'read' ? new Date().toISOString() : undefined,
        }, { onConflict: 'user_id,book_id' });

      if (progressError) throw progressError;

      // 2. Manually sync book_list_items (no trigger exists)
      // Find the target default list
      const targetList = lists.find(l => l.is_default && l.list_type === listType);
      if (!targetList) return; // Lists not loaded yet, skip

      // Remove book from all other default lists first
      const defaultLists = lists.filter(l => l.is_default);
      const otherDefaultListIds = defaultLists
        .filter(l => l.id !== targetList.id)
        .map(l => l.id);

      if (otherDefaultListIds.length > 0) {
        await supabase
          .from('book_list_items')
          .delete()
          .eq('book_id', bookId)
          .in('list_id', otherDefaultListIds);
      }

      // Add to target list (ignore duplicate error)
      const { error: insertError } = await supabase
        .from('book_list_items')
        .upsert(
          { list_id: targetList.id, book_id: bookId },
          { onConflict: 'list_id,book_id', ignoreDuplicates: true }
        );

      // If upsert fails due to no unique constraint, try insert and ignore duplicate
      if (insertError) {
        const { error: fallbackError } = await supabase
          .from('book_list_items')
          .insert({ list_id: targetList.id, book_id: bookId });
        
        // Ignore duplicate key errors (23505)
        if (fallbackError && !fallbackError.message?.includes('duplicate')) {
          throw fallbackError;
        }
      }

      // 3. Also sync user_books table
      await supabase
        .from('user_books')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          status: statusMap[listType],
          started_at: listType === 'reading' ? new Date().toISOString() : undefined,
          completed_at: listType === 'read' ? new Date().toISOString() : undefined,
        }, { onConflict: 'user_id,book_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
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

      // If it was a default list, clear reading_progress and user_books to stay in sync.
      if (list && list.is_default) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('reading_progress')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', bookId);

          await supabase
            .from('user_books')
            .delete()
            .eq('user_id', user.id)
            .eq('book_id', bookId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
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
      const { error: insertError } = await supabase
        .from('book_list_items')
        .insert({ list_id: targetListId, book_id: bookId });

      if (insertError) throw insertError;

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
