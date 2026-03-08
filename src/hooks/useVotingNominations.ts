import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VotingNomination {
  id: string;
  user_id: string;
  book_title: string;
  book_author: string;
  book_cover_url: string | null;
  group_code: string;
  created_at: string;
}

export const useVotingNominations = () => {
  return useQuery({
    queryKey: ['voting_nominations'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voting_nominations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VotingNomination[];
    },
  });
};

export const useAddNomination = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nomination: Omit<VotingNomination, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('voting_nominations')
        .insert(nomination)
        .select()
        .single();
      if (error) throw error;
      return data as VotingNomination;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting_nominations'] });
    },
  });
};

export const useRemoveNomination = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('voting_nominations')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting_nominations'] });
      queryClient.invalidateQueries({ queryKey: ['book_votes'] });
    },
  });
};
