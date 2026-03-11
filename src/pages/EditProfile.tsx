import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const { upload, isUploading } = useFileUpload();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password change
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setAvatarPreview(profile.avatar_url);
    }
    if (user) {
      setNewEmail(user.email || '');
    }
  }, [profile, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setIsUpdating(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const url = await upload('covers', avatarFile, `avatars/${user.id}`);
        if (url) avatarUrl = url;
      }

      await updateProfile.mutateAsync({
        user_id: user.id,
        display_name: displayName,
        username,
        avatar_url: avatarUrl,
      });

      toast.success('Profil güncellendi!');
    } catch {
      toast.error('Profil güncellenirken hata oluştu');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('E-posta güncelleme bağlantısı gönderildi. Lütfen yeni e-postanızı doğrulayın.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'E-posta güncellenemedi';
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Şifre güncellendi!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Şifre güncellenemedi';
      toast.error(message);
    } finally {
      setIsUpdating(false);
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
          <h1 className="font-serif font-bold text-lg">Profili Düzenle</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar */}
        <section className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar
              src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              name={displayName || username}
              size="lg"
            />
            <label className="absolute -bottom-1 -right-1 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <Camera className="w-4 h-4" />
            </label>
          </div>
          {avatarFile && <p className="text-xs text-muted-foreground">Yeni fotoğraf seçildi</p>}
        </section>

        {/* Profile Info */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Profil Bilgileri
          </h2>
          <div className="bg-card rounded-xl border-2 border-border p-4 space-y-4">
            <div>
              <Label htmlFor="displayName">Görünen Ad</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Adınız" className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@kullaniciadi" className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <Button onClick={handleSaveProfile} className="w-full h-12 rounded-xl" disabled={isUpdating || isUploading}>
              {(isUpdating || isUploading) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Profili Kaydet
            </Button>
          </div>
        </section>

        {/* Email */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-posta
          </h2>
          <div className="bg-card rounded-xl border-2 border-border p-4 space-y-4">
            <div>
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <Button variant="outline" onClick={handleUpdateEmail} className="w-full h-12 rounded-xl" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              E-postayı Güncelle
            </Button>
          </div>
        </section>

        {/* Password */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Şifre Değiştir
          </h2>
          <div className="bg-card rounded-xl border-2 border-border p-4 space-y-4">
            <div>
              <Label htmlFor="newPassword">Yeni Şifre</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="En az 6 karakter" className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Şifreyi Onayla</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Şifreyi tekrar girin" className="mt-1.5 h-12 bg-muted border-0 rounded-xl" />
            </div>
            <Button variant="outline" onClick={handleUpdatePassword} className="w-full h-12 rounded-xl" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Şifreyi Güncelle
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EditProfile;
