import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to add a book to a user's default list by type (want_to_read, reading, read, dnf).
 * Keeps user_books, reading_progress and book_list_items explicitly in sync.
 * Group-aware: prioritizes lists matching user's group_code.
 */
export const useAddBookToDefaultList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ bookId, listType }: { bookId: string; listType: 'want_to_read' | 'reading' | 'read' | 'dnf' }) => {
      if (!user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const statusMap: Record<'want_to_read' | 'reading' | 'read' | 'dnf', 'want_to_read' | 'reading' | 'completed' | 'paused'> = {
        want_to_read: 'want_to_read',
        reading: 'reading',
        read: 'completed',
        dnf: 'paused',
      };

      const mappedStatus = statusMap[listType];

      // Get user's group_code first
      const { data: profile } = await supabase
        .from('profiles')
        .select('group_code')
        .eq('user_id', user.id)
        .single();

      const userGroupCode = profile?.group_code;

      // Fetch all default lists for this user
      const { data: allDefaultLists, error: defaultListsError } = await supabase
        .from('book_lists')
        .select('id, list_type, group_code')
        .eq('user_id', user.id)
        .eq('is_default', true);

      if (defaultListsError) throw defaultListsError;

      // Filter lists: prefer those matching user's group_code
      const listsMatchingGroup = allDefaultLists?.filter(l => l.group_code === userGroupCode) ?? [];
      const defaultLists = listsMatchingGroup.length > 0 ? listsMatchingGroup : allDefaultLists;

      const targetList = defaultLists?.find((list) => list.list_type === listType);
      if (!targetList) {
        throw new Error('Varsayılan liste bulunamadı');
      }

      const otherDefaultListIds = (defaultLists ?? [])
        .filter((list) => list.id !== targetList.id)
        .map((list) => list.id);

      const { error: userBookError } = await supabase
        .from('user_books')
        .upsert(
          {
            user_id: user.id,
            book_id: bookId,
            status: mappedStatus,
            started_at: listType === 'reading' ? now : null,
            completed_at: listType === 'read' ? now : null,
          },
          { onConflict: 'user_id,book_id' }
        );

      if (userBookError) throw userBookError;

      const { error: progressError } = await supabase
        .from('reading_progress')
        .upsert(
          {
            user_id: user.id,
            book_id: bookId,
            status: mappedStatus,
            started_at: listType === 'reading' ? now : null,
            completed_at: listType === 'read' ? now : null,
          },
          { onConflict: 'user_id,book_id' }
        );

      if (progressError) throw progressError;

      if (otherDefaultListIds.length > 0) {
        const { error: clearOtherListsError } = await supabase
          .from('book_list_items')
          .delete()
          .eq('book_id', bookId)
          .in('list_id', otherDefaultListIds);

        if (clearOtherListsError) throw clearOtherListsError;
      }

      const { data: existingTargetItem, error: existingTargetItemError } = await supabase
        .from('book_list_items')
        .select('id')
        .eq('list_id', targetList.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (existingTargetItemError) throw existingTargetItemError;

      if (!existingTargetItem) {
        const { error: insertTargetListError } = await supabase
          .from('book_list_items')
          .insert({
            list_id: targetList.id,
            book_id: bookId,
          });

        if (insertTargetListError) throw insertTargetListError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
      queryClient.invalidateQueries({ queryKey: ['user_books'] });
      queryClient.invalidateQueries({ queryKey: ['book_in_lists'] });
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
