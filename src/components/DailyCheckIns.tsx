import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Leaf } from 'lucide-react';
import Avatar from './Avatar';

export const DailyCheckIns = () => {
    const { data: activeReaders = [], isLoading } = useQuery({
        queryKey: ['daily_checkins'],
        queryFn: async () => {
            // Get today's start
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: logs, error: logsError } = await supabase
                .from('reading_log')
                .select('user_id')
                .gte('logged_at', today.toISOString());

            if (logsError) throw logsError;

            // Unique user ids who read today
            const userIds = Array.from(new Set(logs.map(l => l.user_id)));

            if (userIds.length === 0) return [];

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            return profiles;
        },
        refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes instead of every minute
        staleTime: 3 * 60 * 1000,
    });

    if (isLoading) return null;

    return (
        <div className="bg-gradient-to-br from-forest-light/5 to-forest/5 rounded-2xl p-5 shadow-soft mb-6 border border-forest/10">
            <h3 className="font-serif font-semibold text-sm mb-3 text-forest flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                Bugün Okuyanlar
            </h3>
            {activeReaders.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {activeReaders.map((reader) => (
                        <div key={reader.id} className="relative group">
                            <Avatar
                                src={reader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reader.id}`}
                                name={reader.display_name || reader.username || 'Kullanıcı'}
                                size="sm"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border">
                                <Leaf className="w-3 h-3 text-forest" />
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
