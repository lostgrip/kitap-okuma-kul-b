import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { useAuth } from '@/contexts/AuthContext';
import { useClubSchedule } from '@/hooks/useClubSchedule';

export const ClubProgress = () => {
    const { user } = useAuth();
    const { data: schedule = [] } = useClubSchedule();

    // Find the active club book
    const activeBook = schedule.find(s => s.status === 'active');

    const { data: progressData, isLoading } = useQuery({
        queryKey: ['club_collective_progress', activeBook?.book_id],
        queryFn: async () => {
            if (!activeBook) return null;

            // 1. Get the book details (we need page_count)
            const { data: book } = await supabase
                .from('books')
                .select('title, page_count')
                .eq('id', activeBook.book_id)
                .single();

            if (!book) return null;

            // 2. Get members of this group
            const { data: members } = await supabase
                .from('profiles')
                .select('id')
                .eq('group_code', activeBook.group_code);

            if (!members || members.length === 0) return null;

            const memberIds = members.map(m => m.id);

            // 3. Get progress of these members for this book
            const { data: progressList } = await supabase
                .from('reading_progress')
                .select('current_page, status')
                .eq('book_id', activeBook.book_id)
                .in('user_id', memberIds);

            const totalRequiredPages = memberIds.length * (book.page_count || 0);
            let totalReadPages = 0;

            if (progressList) {
                progressList.forEach(p => {
                    if (p.status === 'completed') {
                        totalReadPages += book.page_count || 0;
                    } else {
                        totalReadPages += p.current_page || 0;
                    }
                });
            }

            return {
                bookTitle: book.title,
                totalRequired: totalRequiredPages,
                totalRead: totalReadPages,
                memberCount: memberIds.length
            };
        },
        enabled: !!activeBook,
    });

    if (!activeBook || !progressData) return null;

    const percentage = progressData.totalRequired > 0
        ? Math.min(Math.round((progressData.totalRead / progressData.totalRequired) * 100), 100)
        : 0;

    return (
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 border border-border/50">
            <h3 className="font-serif font-semibold text-sm mb-1 text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Kulübün Ortak Kitabı
            </h3>
            <p className="text-xs text-muted-foreground mb-3">"{progressData.bookTitle}" — {progressData.memberCount} Üye</p>

            <div className="w-full bg-muted rounded-full overflow-hidden h-3">
                <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default ClubProgress;
