import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Discussion {
    id: string;
    book_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    has_spoiler: boolean;
    page_reference: number | null;
    created_at: string;
    updated_at: string;
}

export const useBookDiscussions = (bookId: string) => {
    return useQuery({
        queryKey: ['book_discussions', bookId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('book_discussions')
                .select('*')
                .eq('book_id', bookId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data as Discussion[];
        },
        enabled: !!bookId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddDiscussion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (d: Omit<Discussion, 'id' | 'created_at' | 'updated_at'> & { post_owner_id?: string }) => {
            const { post_owner_id, ...discussion } = d;
            const { data, error } = await supabase
                .from('book_discussions')
                .insert(discussion)
                .select()
                .single();
            if (error) throw error;

            // Notify book/post owner (not self)
            if (post_owner_id && post_owner_id !== discussion.user_id) {
                await supabase.from('notifications').insert({
                    user_id: post_owner_id,
                    type: 'comment',
                    title: 'Gönderinize yorum yapıldı',
                    message: discussion.content.slice(0, 80),
                    data: { book_id: discussion.book_id },
                    is_read: false,
                });
            }

            return data as Discussion;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['book_discussions', vars.book_id] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};


export const useDeleteDiscussion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, book_id }: { id: string; book_id: string }) => {
            const { error } = await supabase.from('book_discussions').delete().eq('id', id);
            if (error) throw error;
            return book_id;
        },
        onSuccess: (book_id) => {
            queryClient.invalidateQueries({ queryKey: ['book_discussions', book_id] });
        },
    });
};
