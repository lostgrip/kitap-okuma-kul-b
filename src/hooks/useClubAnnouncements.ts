import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClubAnnouncement {
    id: string;
    group_code: string;
    created_by: string;
    title: string;
    content: string;
    is_pinned: boolean;
    expires_at: string | null;
    created_at: string;
}

export const useClubAnnouncements = () => {
    return useQuery({
        queryKey: ['club_announcements'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('club_announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as ClubAnnouncement[];
        },
    });
};

export const useAddAnnouncement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (a: Omit<ClubAnnouncement, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('club_announcements')
                .insert(a)
                .select()
                .single();
            if (error) throw error;
            return data as ClubAnnouncement;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club_announcements'] }),
    });
};

export const useDeleteAnnouncement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('club_announcements').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club_announcements'] }),
    });
};
