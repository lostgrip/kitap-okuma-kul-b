import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    queryKey: ['user_books', 'user', userId],
    queryFn: async () => {
      let query = supabase.from('user_books').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as UserBook[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserBookByBookId = (userId: string, bookId: string) => {
  return useQuery({
    queryKey: ['user_books', userId, bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_books')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();
      if (error) throw error;
      return data as UserBook | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpsertUserBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userBook: Partial<UserBook> & { user_id: string; book_id: string }) => {
      const { data, error } = await supabase
        .from('user_books')
        .upsert(userBook, { onConflict: 'user_id,book_id' })
        .select()
        .single();
      if (error) throw error;
      return data as UserBook;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user_books', variables.user_id, variables.book_id],
      });
    },
  });
};

export const useUpdateUserBook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UserBook> & { id: string }) => {
      const { data, error } = await supabase
        .from('user_books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as UserBook;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_books', variables.id] });
    },
  });
};
