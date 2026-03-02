import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClubScheduleItem {
    id: string;
    book_id: string;
    group_code: string;
    start_date: string;
    end_date: string | null;
    status: 'upcoming' | 'active' | 'finished';
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export const useClubSchedule = () => {
    return useQuery({
        queryKey: ['club_schedule'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('club_schedule')
                .select('*')
                .order('start_date', { ascending: true });
            if (error) throw error;
            return data as ClubScheduleItem[];
        },
    });
};

export const useAddClubSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (item: Omit<ClubScheduleItem, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('club_schedule')
                .insert(item)
                .select()
                .single();
            if (error) throw error;
            return data as ClubScheduleItem;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club_schedule'] }),
    });
};

export const useUpdateClubSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ClubScheduleItem> & { id: string }) => {
            const { data, error } = await supabase
                .from('club_schedule')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as ClubScheduleItem;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club_schedule'] }),
    });
};

export const useDeleteClubSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('club_schedule').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club_schedule'] }),
    });
};
