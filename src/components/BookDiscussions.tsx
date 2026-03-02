import { useState } from 'react';
import { MessageCircle, Reply, Eye, EyeOff, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useBookDiscussions, useAddDiscussion, useDeleteDiscussion, Discussion } from '@/hooks/useDiscussions';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { toast } from 'sonner';

interface BookDiscussionsProps {
    bookId: string;
}

const BookDiscussions = ({ bookId }: BookDiscussionsProps) => {
    const { user } = useAuth();
    const { data: isAdmin } = useIsAdmin(user?.id);
    const { data: discussions = [], isLoading } = useBookDiscussions(bookId);
    const { data: profiles = [] } = useProfiles();
    const addDiscussion = useAddDiscussion();
    const deleteDiscussion = useDeleteDiscussion();

    const [newContent, setNewContent] = useState('');
    const [hasSpoiler, setHasSpoiler] = useState(false);
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replySpoiler, setReplySpoiler] = useState(false);
    const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
    const [showAll, setShowAll] = useState(false);

    const getProfile = (userId: string) => profiles.find(p => p.user_id === userId);

    const toggleSpoiler = (id: string) => {
        setRevealedSpoilers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handlePost = async (parentId: string | null = null) => {
        if (!user) { toast.error('Giriş yapmalısınız'); return; }
        const content = parentId ? replyContent : newContent;
        const spoiler = parentId ? replySpoiler : hasSpoiler;
        if (!content.trim()) { toast.error('Mesaj boş olamaz'); return; }

        try {
            await addDiscussion.mutateAsync({
                book_id: bookId,
                user_id: user.id,
                parent_id: parentId,
                content,
                has_spoiler: spoiler,
                page_reference: null,
            });
            if (parentId) { setReplyContent(''); setReplyTo(null); }
            else { setNewContent(''); setHasSpoiler(false); }
            toast.success('Yorum eklendi!');
        } catch {
            toast.error('Yorum eklenirken hata oluştu');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDiscussion.mutateAsync({ id, book_id: bookId });
            toast.success('Yorum silindi');
        } catch {
            toast.error('Yorum silinemedi');
        }
    };

    const roots = discussions.filter(d => !d.parent_id);
    const getReplies = (parentId: string) => discussions.filter(d => d.parent_id === parentId);
    const displayed = showAll ? roots : roots.slice(0, 5);

    const renderPost = (d: Discussion, isReply = false) => {
        const profile = getProfile(d.user_id);
        const isOwn = d.user_id === user?.id;
        const isSpoilerRevealed = revealedSpoilers.has(d.id);
        const replies = getReplies(d.id);

        return (
            <div key={d.id} className={cn('', isReply && 'ml-10 mt-3')}>
                <div className={cn('p-3 rounded-xl border', isReply ? 'bg-muted/30 border-border/50' : 'bg-card border-border')}>
                    <div className="flex items-start gap-2">
                        <Avatar
                            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
                            name={profile?.display_name || profile?.username || 'Anonim'}
                            size="sm"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{profile?.display_name || profile?.username || 'Anonim'}</span>
                                <div className="flex items-center gap-1">
                                    {d.has_spoiler && (
                                        <span className="text-xs bg-amber/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">Spoiler</span>
                                    )}
                                    {(isOwn || isAdmin) && (
                                        <button onClick={() => handleDelete(d.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {d.has_spoiler && !isSpoilerRevealed ? (
                                <button
                                    onClick={() => toggleSpoiler(d.id)}
                                    className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Spoiler içeriği göster
                                </button>
                            ) : (
                                <p className="text-sm mt-1 text-foreground/90 leading-relaxed">{d.content}</p>
                            )}
                            {d.has_spoiler && isSpoilerRevealed && (
                                <button onClick={() => toggleSpoiler(d.id)} className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <EyeOff className="w-3 h-3" /> Gizle
                                </button>
                            )}
                            {user && !isReply && (
                                <button
                                    onClick={() => setReplyTo(replyTo === d.id ? null : d.id)}
                                    className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Reply className="w-3.5 h-3.5" />
                                    Yanıtla
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply form */}
                {replyTo === d.id && (
                    <div className="ml-10 mt-2 space-y-2">
                        <Textarea
                            placeholder="Yanıtınızı yazın..."
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            className="min-h-16 text-sm bg-muted border-0 rounded-xl resize-none"
                        />
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                <input type="checkbox" checked={replySpoiler} onChange={e => setReplySpoiler(e.target.checked)} className="rounded" />
                                Spoiler
                            </label>
                            <div className="flex-1" />
                            <Button variant="ghost" size="sm" onClick={() => { setReplyTo(null); setReplyContent(''); }}>İptal</Button>
                            <Button size="sm" onClick={() => handlePost(d.id)} disabled={addDiscussion.isPending}>Gönder</Button>
                        </div>
                    </div>
                )}

                {replies.length > 0 && (
                    <div className="space-y-0">{replies.map(r => renderPost(r, true))}</div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-8">
            <h2 className="font-serif font-semibold text-lg mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Tartışmalar
                {discussions.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{discussions.length}</span>
                )}
            </h2>

            {/* New comment */}
            {user && (
                <div className="mb-6 space-y-2">
                    <Textarea
                        placeholder="Kitap hakkında düşüncelerinizi paylaşın..."
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        className="min-h-20 bg-card border-border rounded-xl resize-none"
                    />
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={hasSpoiler} onChange={e => setHasSpoiler(e.target.checked)} className="rounded" />
                            Spoiler içeriyor
                        </label>
                        <div className="flex-1" />
                        <Button
                            size="sm"
                            onClick={() => handlePost(null)}
                            disabled={addDiscussion.isPending || !newContent.trim()}
                            className="rounded-lg"
                        >
                            {addDiscussion.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Paylaş'}
                        </Button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : roots.length === 0 ? (
                <div className="bg-card rounded-xl p-6 text-center border border-border">
                    <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">Henüz tartışma yok. İlk yorumu siz yapın!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayed.map(d => renderPost(d))}
                    {roots.length > 5 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                        >
                            {showAll ? <><ChevronUp className="w-4 h-4" /> Daha az göster</> : <><ChevronDown className="w-4 h-4" /> Tüm yorumları gör ({roots.length})</>}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BookDiscussions;
