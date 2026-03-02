import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReadingLogEntry {
    id: string;
    user_id: string;
    book_id: string;
    pages_read: number;
    current_page: number;
    logged_at: string;
}

export const useReadingLog = (userId: string) => {
    return useQuery({
        queryKey: ['reading_log', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reading_log')
                .select('*')
                .eq('user_id', userId)
                .order('logged_at', { ascending: false });
            if (error) throw error;
            return data as ReadingLogEntry[];
        },
        enabled: !!userId,
    });
};

export const useAddReadingLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (entry: Omit<ReadingLogEntry, 'id' | 'logged_at'>) => {
            const { data, error } = await supabase
                .from('reading_log')
                .insert(entry)
                .select()
                .single();
            if (error) throw error;
            return data as ReadingLogEntry;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['reading_log', vars.user_id] });
        },
    });
};

// Compute streak: consecutive days with at least one log entry
export const computeStreak = (logs: ReadingLogEntry[]): number => {
    if (!logs.length) return 0;
    const days = new Set(
        logs.map(l => new Date(l.logged_at).toISOString().split('T')[0])
    );
    const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const day of sortedDays) {
        const d = new Date(day);
        const diff = Math.round((current.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 1) {
            streak++;
            current = d;
        } else {
            break;
        }
    }
    return streak;
};
