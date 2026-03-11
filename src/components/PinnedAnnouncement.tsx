import { useState } from 'react';
import { Megaphone, X, ChevronDown, ChevronUp, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClubAnnouncements, useAddAnnouncement, useDeleteAnnouncement } from '@/hooks/useClubAnnouncements';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useProfiles } from '@/hooks/useProfiles';
import { toast } from 'sonner';

const PinnedAnnouncement = () => {
    const { user } = useAuth();
    const { data: isAdmin } = useIsAdmin(user?.id);
    const { data: announcements = [] } = useClubAnnouncements();
    const { data: profiles = [] } = useProfiles();
    const addAnnouncement = useAddAnnouncement();
    const deleteAnnouncement = useDeleteAnnouncement();

    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [isComposing, setIsComposing] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

    const pinned = announcements.filter(a => a.is_pinned && !dismissed.has(a.id));
    const shown = showAll ? pinned : pinned.slice(0, 1);

    const handleAdd = async () => {
        if (!user || !title.trim() || !content.trim()) {
            toast.error('Başlık ve içerik gereklidir');
            return;
        }
        const profile = getProfile(user.id);
        if (!profile?.group_code) { toast.error('Grup kodu bulunamadı'); return; }
        try {
            await addAnnouncement.mutateAsync({
                group_code: profile.group_code,
                created_by: user.id,
                title,
                content,
                is_pinned: true,
                expires_at: null,
            });
            setTitle('');
            setContent('');
            setIsComposing(false);
            toast.success('Duyuru yayınlandı!');
        } catch {
            toast.error('Duyuru eklenemedi');
        }
    };

    if (pinned.length === 0 && !isAdmin) return null;

    return (
        <div>
            {shown.map(a => (
                <div key={a.id} className="bg-card border border-primary/15 rounded-xl p-4 mb-3 animate-fade-in">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                                <Megaphone className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{a.title}</p>
                                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{a.content}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {isAdmin && (
                                <button onClick={() => deleteAnnouncement.mutate(a.id)} className="text-muted-foreground/50 hover:text-destructive p-1 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={() => setDismissed(prev => new Set([...prev, a.id]))} className="text-muted-foreground/50 hover:text-foreground p-1 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {pinned.length > 1 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors duration-200 mb-3"
                >
                    {showAll ? <><ChevronUp className="w-3 h-3" /> Daha az</> : <><ChevronDown className="w-3 h-3" /> Diğer duyurular ({pinned.length - 1})</>}
                </button>
            )}

            {isAdmin && (
                <div className="mb-3">
                    {!isComposing ? (
                        <button
                            onClick={() => setIsComposing(true)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-primary transition-colors duration-200"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Duyuru ekle
                        </button>
                    ) : (
                        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3 animate-scale-in shadow-card">
                            <h4 className="text-sm font-medium">Yeni Duyuru</h4>
                            <Input placeholder="Başlık..." value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
                            <Textarea placeholder="Duyuru içeriği..." value={content} onChange={e => setContent(e.target.value)} className="min-h-16 text-sm resize-none" />
                            <div className="flex gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setIsComposing(false)} className="text-xs">İptal</Button>
                                <Button size="sm" onClick={handleAdd} disabled={addAnnouncement.isPending} className="text-xs">
                                    {addAnnouncement.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yayınla'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PinnedAnnouncement;
