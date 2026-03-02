import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookReview {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useBookReviews = (bookId?: string) => {
  return useQuery({
    queryKey: ['book_reviews', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('book_id', bookId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BookReview[];
    },
    enabled: !!bookId,
  });
};

export const useUserBookReview = (userId?: string, bookId?: string) => {
  return useQuery({
    queryKey: ['book_reviews', 'user', userId, bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('user_id', userId!)
        .eq('book_id', bookId!)
        .maybeSingle();

      if (error) throw error;
      return data as BookReview | null;
    },
    enabled: !!userId && !!bookId,
  });
};

export const useBookAverageRating = (bookId?: string) => {
  return useQuery({
    queryKey: ['book_reviews', 'average', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_reviews')
        .select('rating')
        .eq('book_id', bookId!);

      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
      return {
        average: sum / data.length,
        count: data.length,
      };
    },
    enabled: !!bookId,
  });
};

export const useCreateBookReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: Omit<BookReview, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('book_reviews')
        .insert(review)
        .select()
        .single();

      if (error) throw error;
      return data as BookReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_reviews'] });
    },
  });
};

export const useUpdateBookReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BookReview> & { id: string }) => {
      const { data, error } = await supabase
        .from('book_reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BookReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_reviews'] });
    },
  });
};

export const useDeleteBookReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_reviews'] });
    },
  });
};
