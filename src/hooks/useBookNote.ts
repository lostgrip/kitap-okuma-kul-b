import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBookNote = (userId: string | undefined, bookId: string | undefined) => {
    return useQuery({
        queryKey: ['book-note', userId, bookId],
        queryFn: async (): Promise<string | null> => {
            if (!userId || !bookId) return null;
            const { data, error } = await supabase
                .from('book_notes')
                .select('note_text')
                .eq('user_id', userId)
                .eq('book_id', bookId)
                .maybeSingle();
            if (error) throw error;
            return (data as any)?.note_text ?? null;
        },
        enabled: !!userId && !!bookId,
    });
};

export const useUpsertBookNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, bookId, noteText }: { userId: string; bookId: string; noteText: string }) => {
            const { error } = await supabase
                .from('book_notes')
                .upsert(
                    { user_id: userId, book_id: bookId, note_text: noteText },
                    { onConflict: 'user_id,book_id' }
                );
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['book-note', variables.userId, variables.bookId] });
        },
    });
};
