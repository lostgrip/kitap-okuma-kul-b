import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyQuote {
  id: string;
  group_code: string;
  user_id: string;
  book_id: string | null;
  quote_text: string;
  author: string | null;
  featured_date: string | null;
  created_at: string;
}

export const useDailyQuote = () => {
  return useQuery({
    queryKey: ['daily_quotes', 'today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_quotes')
        .select('*')
        .eq('featured_date', today)
        .maybeSingle();

      if (error) throw error;
      
      // If no featured quote for today, get the latest one
      if (!data) {
        const { data: latestData, error: latestError } = await supabase
          .from('daily_quotes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (latestError) throw latestError;
        return latestData as DailyQuote | null;
      }
      
      return data as DailyQuote;
    },
  });
};

export const useGroupQuotes = () => {
  return useQuery({
    queryKey: ['daily_quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as DailyQuote[];
    },
  });
};

export const useCreateQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quote: Omit<DailyQuote, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('daily_quotes')
        .insert(quote)
        .select()
        .single();

      if (error) throw error;
      return data as DailyQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_quotes'] });
    },
  });
};
