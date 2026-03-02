import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReadingGoal {
  id: string;
  user_id: string;
  goal_type: 'daily' | 'weekly' | 'monthly';
  target_pages: number;
  target_books: number;
  created_at: string;
  updated_at: string;
}

export const useGoals = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['reading_goals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_goals')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data as ReadingGoal[];
    },
    enabled: !!userId,
  });
};

export const useUpsertGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<ReadingGoal, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('reading_goals')
        .upsert(goal, { onConflict: 'user_id,goal_type' })
        .select()
        .single();

      if (error) throw error;
      return data as ReadingGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading_goals'] });
    },
  });
};
