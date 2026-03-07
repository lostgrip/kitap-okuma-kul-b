import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// UserBook now mirrors reading_progress (user_books was merged into it)
export interface UserBook {
  id: string;
  user_id: string;
  book_id: string;
  status: 'want_to_read' | 'reading' | 'completed' | 'paused';
  last_location: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserBooks = (userId?: string) => {
  return useQuery({
    queryKey: ['reading_progress', 'user', userId],
    queryFn: async () => {
      let query = supabase.from('reading_progress').select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserBook[];
    },
    enabled: !!userId,
  });
};

export const useUserBookByBookId = (userId: string, bookId: string) => {
  return useQuery({
    queryKey: ['reading_progress', userId, bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();

      if (error) throw error;
      return data as UserBook | null;
    },
    enabled: !!userId && !!bookId,
    // EPUB reader polls this to restore location; keep it fresh
    staleTime: 0,
  });
};

export const useUpsertUserBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userBook: Partial<UserBook> & { user_id: string; book_id: string }) => {
      const { data, error } = await supabase
        .from('reading_progress')
        .upsert(userBook, { onConflict: 'user_id,book_id' })
        .select()
        .single();

      if (error) throw error;
      return data as UserBook;
    },
    onSuccess: (_data, variables) => {
      // Targeted invalidation — only invalidate what changed
      queryClient.invalidateQueries({
        queryKey: ['reading_progress', variables.user_id, variables.book_id],
      });
    },
  });
};

export const useUpdateUserBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserBook> & { id: string }) => {
      const { data, error } = await supabase
        .from('reading_progress')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as UserBook;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading_progress', variables.id] });
    },
  });
};
