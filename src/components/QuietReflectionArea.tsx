import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useBookNote, useUpsertBookNote } from '@/hooks/useBookNote';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuietReflectionAreaProps {
    bookId: string;
}

const QuietReflectionArea = ({ bookId }: QuietReflectionAreaProps) => {
    const { user } = useAuth();
    const { data: savedNote, isLoading } = useBookNote(user?.id, bookId);
    const upsertNote = useUpsertBookNote();
    const [noteText, setNoteText] = useState<string>('');
    const [initialized, setInitialized] = useState(false);

    // Populate textarea once data arrives
    if (!initialized && !isLoading && savedNote !== undefined) {
        setNoteText(savedNote ?? '');
        setInitialized(true);
    }

    const handleSave = async () => {
        if (!user) { toast.error('Giriş yapmalısınız'); return; }
        try {
            await upsertNote.mutateAsync({ userId: user.id, bookId, noteText });
            toast.success('Notunuz kaydedildi 🍃');
        } catch {
            toast.error('Not kaydedilirken bir hata oluştu');
        }
    };

    if (!user) return null;

    return (
        <div className="mt-6 mb-2">
            <h3 className="font-serif font-semibold text-base mb-1 text-foreground">
                Kişisel Notum
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
                🔒 Sadece sana görünür — kimseyle paylaşılmaz
            </p>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="relative">
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Bu kitapla ilgili aklıma gelen bir düşünce, bir his, bir an..."
                        rows={5}
                        className={[
                            'w-full resize-none rounded-xl px-4 pt-4 pb-10',
                            'bg-[#FAFAF7] dark:bg-stone-900',
                            'text-stone-700 dark:text-stone-300',
                            'font-serif text-sm leading-relaxed',
                            'border border-stone-200 dark:border-stone-700',
                            'placeholder:text-stone-400 dark:placeholder:text-stone-600',
                            'outline-none ring-0',
                            'focus:border-stone-400 dark:focus:border-stone-500',
                            'transition-colors duration-300',
                        ].join(' ')}
                        style={{ boxShadow: 'none' }}
                    />
                    <div className="absolute bottom-3 right-3">
                        <button
                            onClick={handleSave}
                            disabled={upsertNote.isPending}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-xs font-medium transition-colors duration-200"
                        >
                            {upsertNote.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            Kendime Not Olarak Kaydet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuietReflectionArea;
