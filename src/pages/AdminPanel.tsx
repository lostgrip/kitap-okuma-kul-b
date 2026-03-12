import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Shield,
  Link2,
  Copy,
  X,
  Plus,
  Loader2,
  FolderPlus,
  Calendar,
  BookOpen,
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
import { useGroups, useCreateGroup } from '@/hooks/useGroups';
import { useClubSchedule, useAddClubSchedule, useUpdateClubSchedule, useDeleteClubSchedule } from '@/hooks/useClubSchedule';
import { useBooks, usePendingClubBooks, useApproveClubBook, useDeleteBook } from '@/hooks/useBooks';
import Avatar from '@/components/Avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin(user?.id);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers();
  const { data: inviteCodes = [], isLoading: codesLoading } = useInviteCodes();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const createInviteCode = useCreateInviteCode();
  const deactivateCode = useDeactivateInviteCode();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const createGroup = useCreateGroup();
  const { data: schedule = [], isLoading: scheduleLoading } = useClubSchedule();
  const addSchedule = useAddClubSchedule();
  const updateSchedule = useUpdateClubSchedule();
  const deleteSchedule = useDeleteClubSchedule();
  const { data: books = [] } = useBooks();

  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'groups' | 'schedule'>('members');
  const [isCreateCodeDialogOpen, setIsCreateCodeDialogOpen] = useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isCreateScheduleDialogOpen, setIsCreateScheduleDialogOpen] = useState(false);
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  // Schedule form
  const [scheduleBookId, setScheduleBookId] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');

  // Redirect non-admins
  if (!isAdminLoading && !isAdmin) {
    navigate('/');
    return null;
  }

  if (isAdminLoading || membersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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

  const handleCreateSchedule = async () => {
    if (!user || !profile?.group_code || !scheduleBookId || !scheduleStartDate) {
      toast.error('Kitap ve başlangıç tarihi zorunludur');
      return;
    }
    try {
      await addSchedule.mutateAsync({
        book_id: scheduleBookId,
        group_code: profile.group_code,
        start_date: scheduleStartDate,
        end_date: scheduleEndDate || null,
        status: 'upcoming',
        notes: scheduleNotes || null,
        created_by: user.id,
      });
      setScheduleBookId('');
      setScheduleStartDate('');
      setScheduleEndDate('');
      setScheduleNotes('');
      setIsCreateScheduleDialogOpen(false);
      toast.success('Okuma takvimi oluşturuldu!');
    } catch (error) {
      toast.error('Takvim oluşturulamadı');
    }
  };

  const handleToggleScheduleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'finished' : currentStatus === 'upcoming' ? 'active' : 'upcoming';
    try {
      await updateSchedule.mutateAsync({ id, status: newStatus });
      toast.success(`Durum "${newStatus === 'active' ? 'Aktif' : newStatus === 'finished' ? 'Tamamlandı' : 'Yaklaşan'}" olarak güncellendi`);
    } catch {
      toast.error('Durum güncellenemedi');
    }
  };

  const getBookTitle = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    return book ? book.title : 'Bilinmeyen Kitap';
  };

  const statusLabel = (s: string) => s === 'active' ? 'Aktif' : s === 'finished' ? 'Tamamlandı' : 'Yaklaşan';
  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
    s === 'active' ? 'default' : s === 'finished' ? 'secondary' : 'outline';

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
            { id: 'groups' as const, label: 'Gruplar', icon: FolderPlus, badge: groups.length },
            { id: 'schedule' as const, label: 'Takvim', icon: Calendar, badge: schedule.filter(s => s.status === 'active').length },
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
            {members.map((member: { id: string, user_id: string, user_roles?: { role: string }[], avatar_url?: string | null, username: string, display_name?: string | null }) => {
              const memberRoles = member.user_roles || [];
              const isMemberAdmin = memberRoles.some((r: { role: string }) => r.role === 'admin');
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
                      {createInviteCode.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
                        <Button variant="ghost" size="icon" onClick={() => handleCopyCode(code.invite_code)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeactivateCode(code.id)}>
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

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Gruplar ({groups.length})
              </h2>
              <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    Yeni Grup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Yeni Grup Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="groupName">Grup Adı</Label>
                      <Input
                        id="groupName"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Örn: Edebiyat Kulübü"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="groupCode">Grup Kodu</Label>
                      <Input
                        id="groupCode"
                        value={newGroupCode}
                        onChange={(e) => setNewGroupCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        placeholder="Örn: EDEBIYAT"
                        className="mt-1.5 font-mono"
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Benzersiz, boşluksuz kod (otomatik büyük harf)</p>
                    </div>
                    <div>
                      <Label htmlFor="groupDesc">Açıklama (opsiyonel)</Label>
                      <Textarea
                        id="groupDesc"
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Grup hakkında kısa bir açıklama"
                        className="mt-1.5"
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newGroupCode || !newGroupName) {
                          toast.error('Grup adı ve kodu zorunludur');
                          return;
                        }
                        try {
                          await createGroup.mutateAsync({
                            groupCode: newGroupCode,
                            groupName: newGroupName,
                            description: newGroupDescription,
                          });
                          setNewGroupCode('');
                          setNewGroupName('');
                          setNewGroupDescription('');
                          setIsCreateGroupDialogOpen(false);
                          toast.success('Grup oluşturuldu!');
                        } catch (error: Error | unknown) {
                          if (error instanceof Error && error.message.includes('duplicate')) {
                            toast.error('Bu grup kodu zaten kullanılıyor');
                          } else {
                            toast.error('Grup oluşturulamadı');
                          }
                        }
                      }}
                      className="w-full"
                      disabled={createGroup.isPending}
                    >
                      {createGroup.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Oluştur
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {groupsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
                <FolderPlus className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Henüz grup yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map(group => (
                  <div key={group.id} className="p-4 bg-card rounded-xl border-2 border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{group.group_name}</p>
                        <p className="text-xs font-mono text-primary">{group.group_code}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {profile?.group_code === group.group_code ? 'Aktif' : 'Grup'}
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-2">{group.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Okuma Takvimi ({schedule.length})
              </h2>
              <Dialog open={isCreateScheduleDialogOpen} onOpenChange={setIsCreateScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" />
                    Yeni Program
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-serif">Okuma Programı Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Kitap</Label>
                      <Select value={scheduleBookId} onValueChange={setScheduleBookId}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Kitap seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {books.map(book => (
                            <SelectItem key={book.id} value={book.id}>
                              {book.title} — {book.author}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Başlangıç</Label>
                        <Input
                          type="date"
                          value={scheduleStartDate}
                          onChange={(e) => setScheduleStartDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>Bitiş (opsiyonel)</Label>
                        <Input
                          type="date"
                          value={scheduleEndDate}
                          onChange={(e) => setScheduleEndDate(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Not (opsiyonel)</Label>
                      <Textarea
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.target.value)}
                        placeholder="Örn: Haftada 50 sayfa hedefi"
                        className="mt-1.5"
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={handleCreateSchedule}
                      className="w-full"
                      disabled={addSchedule.isPending}
                    >
                      {addSchedule.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Oluştur
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {scheduleLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border-2 border-border">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Henüz okuma programı yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.map(item => (
                  <div key={item.id} className="p-4 bg-card rounded-xl border-2 border-border space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <p className="font-medium text-sm">{getBookTitle(item.book_id)}</p>
                      </div>
                      <Badge variant={statusVariant(item.status)} className="text-xs shrink-0">
                        {statusLabel(item.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{item.start_date}</span>
                      {item.end_date && <span>→ {item.end_date}</span>}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleToggleScheduleStatus(item.id, item.status)}
                      >
                        {item.status === 'upcoming' ? 'Aktif Yap' : item.status === 'active' ? 'Tamamla' : 'Yaklaşana Al'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={async () => {
                          try {
                            await deleteSchedule.mutateAsync(item.id);
                            toast.success('Program silindi');
                          } catch {
                            toast.error('Silinemedi');
                          }
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Sil
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
