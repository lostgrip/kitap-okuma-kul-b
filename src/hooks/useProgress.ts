import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  status: 'reading' | 'completed' | 'paused' | 'want_to_read';
  last_location: string | null;
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
  last_location?: string;
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
        .maybeSingle();
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

      // Note: List syncing (book_list_items) is now handled by a database trigger 
      // on the reading_progress table. No need for manual frontend syncing.

      // Insert reading_log entry for journal/streak tracking
      const pagesRead = Math.max(0, progress.current_page - prevPage);
      if (pagesRead > 0) {
        await supabase.from('reading_log').insert({
          user_id: progress.user_id,
          book_id: progress.book_id,
          pages_read: pagesRead,
          current_page: progress.current_page,
          logged_at: new Date().toISOString(),
        });
      }

      return data as ReadingProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading_progress'] });
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
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
      queryClient.invalidateQueries({ queryKey: ['book_list_items'] });
    },
  });
};

export const useDeleteProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, book_id }: { user_id: string; book_id: string }) => {
      // Finally drop the reading progress record. 
      // Database cascades or list hooks should handle cleanup if needed,
      // but here we explicitly clear the record.
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
      queryClient.invalidateQueries({ queryKey: ['reading_log'] });
    },
  });
};

