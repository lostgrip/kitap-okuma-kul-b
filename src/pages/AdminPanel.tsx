import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Shield,
  Link2,
  Copy,
  CheckCircle,
  X,
  Plus,
  Loader2,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useGroupMembers, useAddUserRole, useRemoveUserRole } from '@/hooks/useUserRoles';
import { useInviteCodes, useCreateInviteCode, useDeactivateInviteCode } from '@/hooks/useInviteCodes';
import { useCommunityLists, useUpdateBookList, usePendingListProposals } from '@/hooks/useBookLists';
import { useApproveCommunityListItem, useRejectCommunityListItem } from '@/hooks/useBookListActions';
import { usePendingClubBooks, useApproveClubBook, useRejectClubBook } from '@/hooks/useBooks';
import Avatar from '@/components/Avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GroupMember, UserRole } from '@/types';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin(user?.id);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers();
  const { data: inviteCodes = [], isLoading: codesLoading } = useInviteCodes();
  const { data: communityLists = [] } = useCommunityLists();
  const { data: pendingBooks = [] } = usePendingClubBooks();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const createInviteCode = useCreateInviteCode();
  const deactivateCode = useDeactivateInviteCode();
  const updateList = useUpdateBookList();
  const approveClubBook = useApproveClubBook();
  const rejectClubBook = useRejectClubBook();
  const { data: pendingProposals = [] } = usePendingListProposals();
  const approveListItem = useApproveCommunityListItem();
  const rejectListItem = useRejectCommunityListItem();

  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'lists' | 'books' | 'list-items'>('members');
  const [isCreateCodeDialogOpen, setIsCreateCodeDialogOpen] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('');

  const pendingLists = communityLists.filter(list => !list.is_approved && !list.name.startsWith('[ONAY BEKLİYOR]'));

  // Redirect non-admins
  if (!isAdminLoading && !isAdmin) {
    navigate('/');
    return null;
  }

  if (isAdminLoading || membersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleToggleAdmin = async (memberId: string, currentIsAdmin: boolean) => {
    try {
      if (currentIsAdmin) {
        await removeRole.mutateAsync({ userId: memberId, role: 'admin' });
        toast.success('Admin yetkisi kaldırıldı');
      } else {
        await addRole.mutateAsync({ userId: memberId, role: 'admin' });
        toast.success('Admin yetkisi verildi');
      }
    } catch (error) {
      toast.error('Yetki değiştirilemedi');
    }
  };

  const handleCreateInviteCode = async () => {
    if (!user || !profile?.group_code) return;

    try {
      await createInviteCode.mutateAsync({
        groupCode: profile.group_code,
        createdBy: user.id,
        maxUses: newCodeMaxUses ? parseInt(newCodeMaxUses) : null,
      });
      setNewCodeMaxUses('');
      setIsCreateCodeDialogOpen(false);
      toast.success('Davet kodu oluşturuldu!');
    } catch (error) {
      toast.error('Kod oluşturulamadı');
    }
  };

  const handleDeactivateCode = async (codeId: string) => {
    try {
      await deactivateCode.mutateAsync(codeId);
      toast.success('Kod devre dışı bırakıldı');
    } catch (error) {
      toast.error('Kod devre dışı bırakılamadı');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    toast.success('Davet linki kopyalandı!');
  };

  const handleApproveList = async (listId: string) => {
    try {
      await updateList.mutateAsync({ id: listId, is_approved: true });
      toast.success('Liste onaylandı!');
    } catch (error) {
      toast.error('Liste onaylanamadı');
    }
  };

  const handleApproveBook = async (bookId: string) => {
    try {
      await approveClubBook.mutateAsync(bookId);
      toast.success('Kitap kulüp kütüphanesine eklendi!');
    } catch (error) {
      toast.error('Kitap onaylanamadı');
    }
  };

  const handleRejectBook = async (bookId: string) => {
    try {
      await rejectClubBook.mutateAsync(bookId);
      toast.success('Kitap önerisi reddedildi');
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-serif font-bold text-lg">Admin Paneli</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'members' as const, label: 'Üyeler', icon: Users, badge: members.length },
            { id: 'invites' as const, label: 'Davetler', icon: Link2, badge: inviteCodes.length },
            { id: 'books' as const, label: 'Kitaplar', icon: BookOpen, badge: pendingBooks.length },
            { id: 'lists' as const, label: 'Listeler', icon: CheckCircle, badge: pendingLists.length },
            { id: 'list-items' as const, label: 'Liste İstekleri', icon: BookOpen, badge: pendingProposals.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {tab.badge}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Grup Üyeleri ({members.length})
            </h2>
            {members.map((member: any) => {
              const memberRoles = member.user_roles || [];
              const isMemberAdmin = memberRoles.some((r: UserRole) => r.role === 'admin');
              const isCurrentUser = member.user_id === user?.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-border"
                >
                  <Avatar
                    src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                    name={member.display_name || member.username}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {member.display_name || member.username}
                        {isCurrentUser && <span className="text-muted-foreground"> (Sen)</span>}
                      </p>
                      {isMemberAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">@{member.username}</p>
                  </div>
                  {!isCurrentUser && (
                    <Button
                      variant={isMemberAdmin ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleAdmin(member.user_id, isMemberAdmin)}
                      disabled={addRole.isPending || removeRole.isPending}
                    >
                      {isMemberAdmin ? 'Yetkiyi Al' : 'Admin Yap'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Davet Kodları
              </h2>
              <Dialog open={isCreateCodeDialogOpen} onOpenChange={setIsCreateCodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    Yeni Kod
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Davet Kodu Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="maxUses">Maksimum Kullanım (opsiyonel)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        value={newCodeMaxUses}
                        onChange={(e) => setNewCodeMaxUses(e.target.value)}
                        placeholder="Sınırsız için boş bırakın"
                        className="mt-1.5"
                      />
                    </div>
                    <Button
                      onClick={handleCreateInviteCode}
                      className="w-full"
                      disabled={createInviteCode.isPending}
                    >
                      {createInviteCode.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Oluştur
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {codesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : inviteCodes.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
                <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Henüz davet kodu yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inviteCodes.map(code => (
                  <div
                    key={code.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2',
                      code.is_active
                        ? 'bg-card border-border'
                        : 'bg-muted/50 border-muted opacity-60'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium">{code.invite_code}</p>
                      <p className="text-xs text-muted-foreground">
                        {code.uses_count}/{code.max_uses || '∞'} kullanım
                        {!code.is_active && ' • Devre dışı'}
                      </p>
                    </div>
                    {code.is_active && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyCode(code.invite_code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateCode(code.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Books Tab - Pending club book approvals */}
        {activeTab === 'books' && (
          <div className="space-y-4">
            <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Onay Bekleyen Kitaplar ({pendingBooks.length})
            </h2>

            {pendingBooks.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Onay bekleyen kitap yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingBooks.map(book => (
                  <div
                    key={book.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-border"
                  >
                    <img
                      src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveBook(book.id)}
                        disabled={approveClubBook.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Onayla
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectBook(book.id)}
                        disabled={rejectClubBook.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lists Tab */}
        {activeTab === 'lists' && (
          <div className="space-y-4">
            <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Onay Bekleyen Listeler ({pendingLists.length})
            </h2>

            {pendingLists.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Onay bekleyen liste yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingLists.map(list => (
                  <div
                    key={list.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{list.name}</p>
                      {list.description && (
                        <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApproveList(list.id)}
                      disabled={updateList.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Onayla
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List Items Tab (Pending Proposals) */}
        {activeTab === 'list-items' && (
          <div className="space-y-4">
            <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Onay Bekleyen Liste Kitapları ({pendingProposals.length})
            </h2>

            {pendingProposals.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Onay bekleyen liste eklentisi yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingProposals.map((proposal: any) => (
                  <div
                    key={proposal.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border-2 border-border"
                  >
                    <img
                      src={proposal.book?.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop'}
                      alt={proposal.book?.title}
                      className="w-10 h-14 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{proposal.book?.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-semibold text-primary">{proposal.originalListName}</span> listesine eklenmek isteniyor
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await approveListItem.mutateAsync({
                              pendingListId: proposal.shadowListId,
                              targetListId: proposal.targetListId,
                              bookId: proposal.book_id
                            });
                            toast.success('Kitap listeye eklendi!');
                          } catch {
                            toast.error('İşlem başarısız!');
                          }
                        }}
                        disabled={approveListItem.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Onayla
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await rejectListItem.mutateAsync({
                              pendingListId: proposal.shadowListId,
                              bookId: proposal.book_id
                            });
                            toast.success('Liste isteği reddedildi.');
                          } catch {
                            toast.error('İşlem başarısız!');
                          }
                        }}
                        disabled={rejectListItem.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
