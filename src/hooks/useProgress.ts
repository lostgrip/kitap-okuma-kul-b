import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  status: 'reading' | 'completed' | 'paused' | 'want_to_read';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewProgress {
  user_id: string;
  book_id: string;
  current_page?: number;
  status?: 'reading' | 'completed' | 'paused' | 'want_to_read';
}

export const useAllProgress = () => {
  return useQuery({
    queryKey: ['reading_progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*');

      if (error) throw error;
      return data as ReadingProgress[];
    },
  });
};

export const useUserProgress = (userId: string) => {
  return useQuery({
    queryKey: ['reading_progress', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as ReadingProgress[];
    },
    enabled: !!userId,
  });
};

export const useBookProgress = (bookId: string) => {
  return useQuery({
    queryKey: ['reading_progress', 'book', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', bookId);

      if (error) throw error;
      return data as ReadingProgress[];
    },
    enabled: !!bookId,
  });
};

export const useUpsertProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (progress: NewProgress & { current_page: number }) => {
      // Fetch current page BEFORE upsert so we can calculate pages_read for the log
      const { data: existing } = await supabase
        .from('reading_progress')
        .select('current_page')
        .eq('user_id', progress.user_id)
        .eq('book_id', progress.book_id)
        .single();
      const prevPage = existing?.current_page || 0;

      const { data, error } = await supabase
        .from('reading_progress')
        .upsert(
          {
            ...progress,
            status: progress.status || 'reading',
            started_at: progress.status === 'reading' ? new Date().toISOString() : undefined,
            completed_at: progress.status === 'completed' ? new Date().toISOString() : undefined,
          },
          { onConflict: 'user_id,book_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // Auto-sync with user_books and book_list_items
      const bookStatus = progress.status === 'completed' ? 'read' : 'reading';

      // Update user_books
      await supabase
        .from('user_books')
        .upsert({
          user_id: progress.user_id,
          book_id: progress.book_id,
          status: bookStatus,
          started_at: new Date().toISOString(),
          completed_at: progress.status === 'completed' ? new Date().toISOString() : undefined,
        }, { onConflict: 'user_id,book_id' });

      // Find user's default lists and move book to correct list
      const listType = progress.status === 'completed' ? 'read' : 'reading';
      const { data: userLists } = await supabase
        .from('book_lists')
        .select('id, list_type')
        .eq('user_id', progress.user_id)
        .eq('is_default', true)
        .eq('is_community', false);

      if (userLists) {
        // Remove from all default lists
        for (const list of userLists) {
          await supabase
            .from('book_list_items')
            .delete()
            .eq('list_id', list.id)
            .eq('book_id', progress.book_id);
        }
        // Add to correct list
        const targetList = userLists.find(l => l.list_type === listType);
        if (targetList) {
          await supabase
            .from('book_list_items')
            .insert({ list_id: targetList.id, book_id: progress.book_id });
        }
      }

      // Insert reading_log entry for journal/streak tracking
      const pagesRead = Math.max(0, progress.current_page - prevPage);
      await supabase.from('reading_log').insert({
        user_id: progress.user_id,
        book_id: progress.book_id,
        pages_read: pagesRead,
        current_page: progress.current_page,
        logged_at: new Date().toISOString(),
      });

      return data as ReadingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['user_books'] });
      queryClient.invalidateQueries({ queryKey: ['reading_log'] });
    },
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReadingProgress> & { id: string }) => {
      const updatedData = {
        ...updates,
        completed_at: updates.status === 'completed' ? new Date().toISOString() : updates.completed_at,
      };

      const { data, error } = await supabase
        .from('reading_progress')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ReadingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
    },
  });
};

export const useDeleteProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, book_id }: { user_id: string; book_id: string }) => {
      // 1. Differentiate by checking default lists and clearing user_books/list_items first.

      // Delete from user_books
      await supabase
        .from('user_books')
        .delete()
        .eq('user_id', user_id)
        .eq('book_id', book_id);

      // Find user's default lists 
      const { data: userLists } = await supabase
        .from('book_lists')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_default', true)
        .eq('is_community', false);

      if (userLists) {
        // Remove from all default lists
        for (const list of userLists) {
          await supabase
            .from('book_list_items')
            .delete()
            .eq('list_id', list.id)
            .eq('book_id', book_id);
        }
      }

      // Finally drop the reading wrapper entirely
      const { error } = await supabase
        .from('reading_progress')
        .delete()
        .eq('user_id', user_id)
        .eq('book_id', book_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
      queryClient.invalidateQueries({ queryKey: ['user_books'] });
    },
  });
};
