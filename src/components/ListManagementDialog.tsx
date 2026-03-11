import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBookLists, useCommunityLists, BookList, useCreateBookList } from '@/hooks/useBookLists';
import { useAddBookToDefaultList, useAddBookToCustomList, useRemoveBookFromList } from '@/hooks/useBookListActions';
import { useBookInLists } from '@/hooks/useBookLists';
import { toast } from 'sonner';

interface ListManagementDialogProps {
    bookId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ListManagementDialog = ({ bookId, open, onOpenChange }: ListManagementDialogProps) => {
    const { user, profile } = useAuth();

    // Queries
    const { data: userLists = [], isLoading: listsLoading } = useBookLists(user?.id);
    const { data: communityLists = [], isLoading: communityLoading } = useCommunityLists();
    const { data: currentListIds = [], isLoading: activeListsLoading } = useBookInLists(open ? bookId : '');

    // Mutations
    const addToDefault = useAddBookToDefaultList();
    const addToCustom = useAddBookToCustomList();
    const removeFromList = useRemoveBookFromList();
    const createList = useCreateBookList();

    const [localSelections, setLocalSelections] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

    // Sync initial state when modal opens
    useEffect(() => {
        if (open) {
            setLocalSelections(new Set(currentListIds));
        }
    }, [open, currentListIds]);

    const allListsLoading = listsLoading || communityLoading || activeListsLoading;

    // Filter lists down to standard viewable ones
    const defaultLists = userLists.filter(l => l.is_default && !l.is_community);
    const customLists = userLists.filter(l => !l.is_default && !l.is_community);

    // We only show approved community lists for standard adding. 
    // Any "Pending" pseudo-lists are purely for admin-queue purposes.
    const approvedCommunityLists = communityLists.filter(l => l.is_approved && !l.name.startsWith('[ONAY BEKLİYOR]'));

    const handleToggleList = async (list: BookList, isChecked: boolean) => {
        if (!user) return;
        setIsProcessing(true);

        const newSelections = new Set(localSelections);

        try {
            if (isChecked) {
                // ADD to list
                if (list.is_default) {
                    await addToDefault.mutateAsync({ bookId, listType: list.list_type as 'want_to_read' | 'reading' | 'read' | 'dnf' });
                    // Note: Adding to a default list automatically removes from other default lists in the backend hook.
                    // For UI optimism, we should uncheck other default lists.
                    defaultLists.forEach(dl => {
                        if (dl.id !== list.id) newSelections.delete(dl.id);
                    });
                    newSelections.add(list.id);
                } else if (list.is_community) {
                    // Community List shadow-approval logic
                    // Find or create the corresponding [PENDING] shadow list
                    const shadowName = `[ONAY BEKLİYOR] ${list.name}`;
                    let shadowList = communityLists.find(l => l.name === shadowName);

                    if (!shadowList) {
                        shadowList = await createList.mutateAsync({
                            user_id: user.id,
                            group_code: profile?.group_code || null,
                            name: shadowName,
                            description: list.id, // Store target list ID in description for Admin tracking
                            is_default: false,
                            is_community: true,
                            is_approved: false,
                            list_type: 'custom'
                        });
                    }

                    // Add to shadow list instead of real list
                    await addToCustom.mutateAsync({ listId: shadowList.id, bookId });
                    toast.success(`${list.name} listesine önerildi. Admin onayı bekleniyor.`);
                    // We intentionally don't add the real list's ID to our active selection until it's approved.
                    // But effectively it is "pending". We could track pending state visually if desired.
                } else {
                    // Normal custom list
                    await addToCustom.mutateAsync({ listId: list.id, bookId });
                    newSelections.add(list.id);
                    toast.success(`${list.name} listesine eklendi.`);
                }
            } else {
                // REMOVE from list
                if (list.is_community) {
                    toast.error("Kulüp listelerinden kitap çıkarmak için doğrudan Admin sayfasına başvurun.");
                    setIsProcessing(false);
                    return;
                }

                await removeFromList.mutateAsync({ listId: list.id, bookId });
                newSelections.delete(list.id);
                toast.success(`${list.name} listesinden çıkarıldı.`);
            }

            setLocalSelections(newSelections);
        } catch (error) {
            toast.error('Liste güncellenirken bir hata oluştu.');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl">Listeleri Yönet</DialogTitle>
                    <DialogDescription>
                        Kitabın bulunduğu kişisel ve kulüp listelerini düzenleyin.
                    </DialogDescription>
                </DialogHeader>

                {allListsLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScrollArea className="max-h-[60vh] -mx-1 px-1 mt-4">
                        <div className="space-y-6 pb-4">

                            {/* STATUS LISTS */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Durum</h4>
                                <div className="space-y-2">
                                    {defaultLists.map((list) => (
                                        <div key={list.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                                            <Checkbox
                                                id={list.id}
                                                checked={localSelections.has(list.id)}
                                                onCheckedChange={(checked) => handleToggleList(list, checked as boolean)}
                                                disabled={isProcessing}
                                                className="h-5 w-5"
                                            />
                                            <label
                                                htmlFor={list.id}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                            >
                                                {list.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CUSTOM PERSONAL LISTS */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kişisel Listelerim</h4>
                                {customLists.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic px-2">Henüz özel listeniz yok.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {customLists.map((list) => (
                                            <div key={list.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                                                <Checkbox
                                                    id={list.id}
                                                    checked={localSelections.has(list.id)}
                                                    onCheckedChange={(checked) => handleToggleList(list, checked as boolean)}
                                                    disabled={isProcessing}
                                                    className="h-5 w-5"
                                                />
                                                <label
                                                    htmlFor={list.id}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                                >
                                                    {list.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* COMMUNITY LISTS */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kulüp Listeleri</h4>
                                {approvedCommunityLists.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic px-2">Kulübünüze ait liste bulunmuyor.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {approvedCommunityLists.map((list) => {
                                            const isAlreadyInList = localSelections.has(list.id);
                                            return (
                                                <div key={list.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 transition-colors">
                                                    <Checkbox
                                                        id={list.id}
                                                        checked={isAlreadyInList}
                                                        onCheckedChange={(checked) => handleToggleList(list, checked as boolean)}
                                                        disabled={isProcessing || isAlreadyInList}
                                                        className="h-5 w-5"
                                                    />
                                                    <label
                                                        htmlFor={list.id}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed flex-1 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <div>
                                                            {list.name}
                                                            {isAlreadyInList && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Eklendi</span>}
                                                        </div>
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground px-2">
                                    Not: Kulüp listelerine eklediğiniz onay gerektirir. Çıkarmak için yöneticilerle iletişime geçin.
                                </p>
                            </div>

                        </div>
                    </ScrollArea>
                )}

                <div className="flex justify-end pt-4 border-t border-border mt-2">
                    <Button onClick={() => onOpenChange(false)}>Tamam</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ListManagementDialog;
