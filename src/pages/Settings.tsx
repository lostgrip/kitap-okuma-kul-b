import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
  Target,
  User,
  LogOut,
  ChevronRight,
  Shield,
  HelpCircle,
  MessageSquare,
  Loader2,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { useAuth } from '@/contexts/AuthContext';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useNotifications';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: notificationSettings, isLoading } = useNotificationSettings(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const updateSettings = useUpdateNotificationSettings();

  const [isDarkMode, setIsDarkMode] = useState(false);

  const faqItems = [
    {
      question: 'Nasıl kitap ekleyebilirim?',
      answer: 'Kütüphane sekmesine gidip sağ alttaki + butonuna tıklayarak yeni kitap ekleyebilirsiniz. Kitap adını yazdığınızda Open Library veritabanından otomatik öneriler alabilirsiniz.'
    },
    {
      question: 'Okuma ilerlememi nasıl güncellerim?',
      answer: 'Ana sayfada aktif okuduğunuz kitabı seçip sayfa numarasını güncelleyebilirsiniz. İlerleme otomatik olarak kaydedilir.'
    },
    {
      question: 'Hedeflerimi nasıl belirlerim?',
      answer: 'Ayarlar menüsündeki "Tercihler -> Okuma Hedefleri" sekmesinden günlük, haftalık ve aylık okuma hedeflerinizi belirleyebilirsiniz.'
    },
    {
      question: 'Sosyal akış nasıl çalışır?',
      answer: 'Sosyal sekmesinden diğer kullanıcıların paylaşımlarını görebilir, kendi güncellemelerinizi ve alıntılarınızı paylaşabilirsiniz.'
    },
    {
      question: 'Verilerim güvende mi?',
      answer: 'Evet, tüm verileriniz güvenli sunucularda şifrelenerek saklanır. Kişisel bilgileriniz üçüncü taraflarla paylaşılmaz.'
    }
  ];

  // Check initial dark mode state
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);

    if (newValue) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings, value: boolean) => {
    if (!user) return;

    updateSettings.mutate({
      userId: user.id,
      [key]: value,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Çıkış yapıldı');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif font-bold text-lg">Ayarlar</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Notifications Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Bildirimler
          </h2>
          <div className="bg-card rounded-xl border-2 border-border divide-y divide-border">
            {isLoading ? (
              <div className="p-5 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Push Bildirimleri</p>
                    <p className="text-xs text-muted-foreground">Uygulama dışında bildirim al</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.push_enabled ?? true}
                    onCheckedChange={(v) => handleNotificationToggle('push_enabled', v)}
                  />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Yeni Kitap Bildirimleri</p>
                    <p className="text-xs text-muted-foreground">Kulübe yeni kitap eklendiğinde</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.new_book_notifications ?? true}
                    onCheckedChange={(v) => handleNotificationToggle('new_book_notifications', v)}
                  />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Sosyal Bildirimler</p>
                    <p className="text-xs text-muted-foreground">Beğeni ve yorum bildirimleri</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.social_notifications ?? true}
                    onCheckedChange={(v) => handleNotificationToggle('social_notifications', v)}
                  />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Hedef Hatırlatıcıları</p>
                    <p className="text-xs text-muted-foreground">Okuma hedefleriniz hakkında</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.goal_reminders ?? true}
                    onCheckedChange={(v) => handleNotificationToggle('goal_reminders', v)}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Tercihler
          </h2>
          <div className="bg-card rounded-xl border-2 border-border divide-y divide-border">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <p className="font-medium text-sm">Karanlık Mod</p>
                  <p className="text-xs text-muted-foreground">Gözlerinizi yormasın</p>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium text-sm">Okuma Hedefleri</p>
                  <p className="text-xs text-muted-foreground">Günlük, haftalık, aylık</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Account Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Hesap
          </h2>
          <div className="bg-card rounded-xl border-2 border-border divide-y divide-border">
            <button
              onClick={() => navigate('/edit-profile')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5" />
                <p className="font-medium text-sm">Profili Düzenle</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate('/privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <p className="font-medium text-sm">Gizlilik</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Admin Section */}
        {isAdmin && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Yönetici
            </h2>
            <div className="bg-card rounded-xl border-2 border-border">
              <button
                onClick={() => navigate('/admin')}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Admin Paneli</p>
                    <p className="text-xs text-muted-foreground">Üyeleri ve listeleri yönet</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </section>
        )}

        {/* Support Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Destek ve Yardım
          </h2>
          <div className="bg-card rounded-xl border-2 border-border mb-4">
            <button
              onClick={() => navigate('/profile')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" />
                <p className="font-medium text-sm">Geri Bildirim Gönder</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Sıkça Sorulan Sorular
          </h2>
          <div className="bg-card rounded-2xl border-2 border-border p-5 sm:p-6 shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Sign Out */}
        {user && (
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </Button>
        )}
      </div>
    </div>
  );
};

export default Settings;
