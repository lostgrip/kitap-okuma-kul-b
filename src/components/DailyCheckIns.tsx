import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Leaf } from 'lucide-react';
import Avatar from './Avatar';

export const DailyCheckIns = () => {
    const { data: activeReaders = [], isLoading } = useQuery({
        queryKey: ['daily_checkins'],
        queryFn: async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: logs, error: logsError } = await supabase
                .from('reading_log')
                .select('user_id')
                .gte('logged_at', today.toISOString());

            if (logsError) throw logsError;

            const userIds = Array.from(new Set(logs.map(l => l.user_id)));
            if (userIds.length === 0) return [];

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, username, display_name, avatar_url')
                .in('user_id', userIds);

            if (profilesError) throw profilesError;
            return profiles;
        },
        refetchInterval: 5 * 60 * 1000,
        staleTime: 3 * 60 * 1000,
    });

    if (isLoading) return null;

    return (
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/40 mb-6">
            <h3 className="font-serif font-semibold text-sm mb-3 text-forest flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                Bugün Okuyanlar
            </h3>
            {activeReaders.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {activeReaders.map((reader) => (
                        <div key={reader.user_id} className="relative group">
                            <Avatar
                                src={reader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reader.user_id}`}
                                name={reader.display_name || reader.username || 'Kullanıcı'}
                                size="sm"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-sm">
                                <Leaf className="w-2.5 h-2.5 text-forest" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">Bugün henüz okuyan olmadı. İlk adımı sen at! 🌱</p>
            )}
        </div>
    );
};

export default DailyCheckIns;
