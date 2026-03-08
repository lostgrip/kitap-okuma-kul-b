import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookVote {
    id: string;
    book_id: string;
    user_id: string;
    group_code: string;
    created_at: string;
}

export const useBookVotes = () => {
    return useQuery({
        queryKey: ['book_votes'],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('book_votes')
                .select('*');
            if (error) throw error;
            return data as BookVote[];
        },
    });
};

export const useAddBookVote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vote: Omit<BookVote, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('book_votes')
                .insert(vote)
                .select()
                .single();
            if (error) throw error;
            return data as BookVote;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['book_votes'] }),
    });
};

export const useRemoveBookVote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ book_id, user_id }: { book_id: string; user_id: string }) => {
            const { error } = await supabase
                .from('book_votes')
                .delete()
                .eq('book_id', book_id)
                .eq('user_id', user_id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['book_votes'] }),
    });
};
