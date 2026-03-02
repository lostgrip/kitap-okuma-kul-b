import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  BarChart3,
  Shield,
  HelpCircle,
  MessageSquare,
  LogOut,
  ChevronRight,
  BookOpen,
  Calendar,
  TrendingUp,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Avatar from '@/components/Avatar';
import YearInReview from '@/components/YearInReview';
import ReadingJournal from '@/components/ReadingJournal';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals, useUpsertGoal } from '@/hooks/useGoals';
import { useUserProgress } from '@/hooks/useProgress';
import { useBooks } from '@/hooks/useBooks';
import { useReadingLog } from '@/hooks/useReadingLog';
import { useSubmitFeedback } from '@/hooks/useFeedback';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Goal } from '@/types';

const goalSchema = z.object({
  goal_type: z.enum(['daily', 'weekly', 'monthly']),
  target_pages: z.number().min(0, 'Geçerli bir sayfa sayısı giriniz'),
  target_books: z.number().min(0, 'Geçerli bir kitap sayısı giriniz'),
});

const feedbackSchema = z.object({
  feedback_type: z.enum(['suggestion', 'complaint', 'question', 'other']),
  email: z.string().email('Geçerli bir e-posta giriniz').optional().or(z.literal('')),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır'),
  message: z.string().min(10, 'Mesajınız en az 10 karakter olmalıdır'),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { data: goals = [] } = useGoals(user?.id);
  const { data: progress = [] } = useUserProgress(user?.id || '');
  const { data: books = [] } = useBooks();
  const { data: logs = [] } = useReadingLog(user?.id || '');
  const upsertGoal = useUpsertGoal();
  const submitFeedback = useSubmitFeedback();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goal_type: 'daily',
      target_pages: 0,
      target_books: 0,
    }
  });

  const feedbackForm = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedback_type: 'suggestion',
      email: '',
      subject: '',
      message: '',
    }
  });

  const getGoal = (type: 'daily' | 'weekly' | 'monthly'): Goal | undefined => {
    return goals.find((g: Goal) => g.goal_type === type);
  };

  const onGoalSubmit = async (data: GoalFormValues) => {
    if (!user) {
      toast.error('Hedef kaydetmek için giriş yapmalısınız');
      return;
    }

    try {
      await upsertGoal.mutateAsync({
        user_id: user.id,
        goal_type: data.goal_type,
        target_pages: data.target_pages,
        target_books: data.target_books,
      });
      toast.success('Hedef kaydedildi!');
      setGoalDialogOpen(false);
      goalForm.reset();
    } catch (error) {
      toast.error('Hedef kaydedilemedi');
    }
  };

  const onFeedbackSubmit = async (data: FeedbackFormValues) => {
    try {
      await submitFeedback.mutateAsync({
        user_id: user?.id,
        email: data.email || undefined,
        feedback_type: data.feedback_type,
        subject: data.subject,
        message: data.message,
      });
      toast.success('Geri bildiriminiz alındı, teşekkürler!');
      feedbackForm.reset();
    } catch (error) {
      toast.error('Geri bildirim gönderilemedi');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Calculate statistics
  const completedBooks = progress.filter(p => p.status === 'completed').length;
  const readingBooks = progress.filter(p => p.status === 'reading').length;
  const totalPagesRead = progress.reduce((acc, p) => acc + p.current_page, 0);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-serif font-semibold">Hesabım</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Profile Card */}
        {user && profile && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar
                  src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                  name={profile.display_name || profile.username}
                  size="lg"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-serif font-semibold">
                    {profile.display_name || profile.username}
                  </h2>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-muted rounded-xl">
                  <BookOpen className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{readingBooks}</p>
                  <p className="text-xs text-muted-foreground">Okunan</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-xl">
                  <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{completedBooks}</p>
                  <p className="text-xs text-muted-foreground">Tamamlanan</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-xl">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{totalPagesRead}</p>
                  <p className="text-xs text-muted-foreground">Sayfa</p>
                </div>
              </div>

              {/* Year in review */}
              {progress.length > 0 && (
                <div className="mt-4">
                  <YearInReview progress={progress} books={books} logs={logs} />
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Reading journal (30-day heatmap) */}
        {user && logs.length > 0 && <ReadingJournal logs={logs} />}

        {!user && (
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Hedeflerinizi takip etmek ve istatistiklerinizi görmek için giriş yapın
              </p>
              <Button onClick={() => navigate('/auth')}>
                Giriş Yap / Kayıt Ol
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="goals" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="goals" className="text-xs">
              <Target className="h-4 w-4 mr-1" />
              Hedefler
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              <BarChart3 className="h-4 w-4 mr-1" />
              İstatistik
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs">
              <MessageSquare className="h-4 w-4 mr-1" />
              İletişim
            </TabsTrigger>
          </TabsList>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-semibold">Okuma Hedeflerim</h3>
              {user && (
                <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Hedef Ekle</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Hedef Belirle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Hedef Tipi</Label>
                        <Controller
                          name="goal_type"
                          control={goalForm.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Günlük</SelectItem>
                                <SelectItem value="weekly">Haftalık</SelectItem>
                                <SelectItem value="monthly">Aylık</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {goalForm.formState.errors.goal_type && (
                          <p className="text-xs text-destructive mt-1">{goalForm.formState.errors.goal_type.message}</p>
                        )}
                      </div>
                      <div>
                        <Label>Hedef Sayfa</Label>
                        <Input
                          type="number"
                          placeholder="Örn: 30"
                          {...goalForm.register('target_pages', { valueAsNumber: true })}
                          className="mt-1"
                        />
                        {goalForm.formState.errors.target_pages && (
                          <p className="text-xs text-destructive mt-1">{goalForm.formState.errors.target_pages.message}</p>
                        )}
                      </div>
                      <div>
                        <Label>Hedef Kitap</Label>
                        <Input
                          type="number"
                          placeholder="Örn: 1"
                          {...goalForm.register('target_books', { valueAsNumber: true })}
                          className="mt-1"
                        />
                        {goalForm.formState.errors.target_books && (
                          <p className="text-xs text-destructive mt-1">{goalForm.formState.errors.target_books.message}</p>
                        )}
                      </div>
                      <Button onClick={goalForm.handleSubmit(onGoalSubmit)} className="w-full" disabled={upsertGoal.isPending}>
                        {upsertGoal.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Goal Cards */}
            {['daily', 'weekly', 'monthly'].map((type) => {
              const goal = getGoal(type as 'daily' | 'weekly' | 'monthly');
              const labels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık' };
              const icons = { daily: Calendar, weekly: Calendar, monthly: Calendar };
              const Icon = icons[type as keyof typeof icons];

              return (
                <Card key={type}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{labels[type as keyof typeof labels]} Hedef</p>
                          {goal ? (
                            <p className="text-sm text-muted-foreground">
                              {goal.target_pages > 0 && `${goal.target_pages} sayfa`}
                              {goal.target_pages > 0 && goal.target_books > 0 && ' • '}
                              {goal.target_books > 0 && `${goal.target_books} kitap`}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Hedef belirlenmedi</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Okuma İstatistikleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Toplam Okunan Sayfa</span>
                  <span className="font-bold text-lg">{totalPagesRead}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Şu An Okunan Kitap</span>
                  <span className="font-bold text-lg">{readingBooks}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Tamamlanan Kitap</span>
                  <span className="font-bold text-lg">{completedBooks}</span>
                </div>
              </CardContent>
            </Card>

            {!user && (
              <p className="text-center text-muted-foreground text-sm">
                Detaylı istatistikler için giriş yapın
              </p>
            )}
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Öneri ve Şikayet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Geri Bildirim Türü</Label>
                  <Controller
                    name="feedback_type"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="suggestion">Öneri</SelectItem>
                          <SelectItem value="complaint">Şikayet</SelectItem>
                          <SelectItem value="question">Soru</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {feedbackForm.formState.errors.feedback_type && (
                    <p className="text-xs text-destructive mt-1">{feedbackForm.formState.errors.feedback_type.message}</p>
                  )}
                </div>

                {!user && (
                  <div>
                    <Label>E-posta (Opsiyonel)</Label>
                    <Input
                      type="email"
                      placeholder="Yanıt almak için e-posta adresiniz"
                      {...feedbackForm.register('email')}
                      className="mt-1"
                    />
                    {feedbackForm.formState.errors.email && (
                      <p className="text-xs text-destructive mt-1">{feedbackForm.formState.errors.email.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Konu *</Label>
                  <Input
                    placeholder="Konu başlığı"
                    {...feedbackForm.register('subject')}
                    className="mt-1"
                  />
                  {feedbackForm.formState.errors.subject && (
                    <p className="text-xs text-destructive mt-1">{feedbackForm.formState.errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <Label>Mesaj *</Label>
                  <Textarea
                    placeholder="Mesajınızı yazın..."
                    {...feedbackForm.register('message')}
                    className="mt-1 min-h-[120px]"
                  />
                  {feedbackForm.formState.errors.message && (
                    <p className="text-xs text-destructive mt-1">{feedbackForm.formState.errors.message.message}</p>
                  )}
                </div>

                <Button
                  onClick={feedbackForm.handleSubmit(onFeedbackSubmit)}
                  className="w-full"
                  disabled={submitFeedback.isPending}
                >
                  {submitFeedback.isPending ? 'Gönderiliyor...' : 'Gönder'}
                </Button>
              </CardContent>
            </Card>

            {/* Privacy Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Gizlilik Politikası</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kişisel verileriniz güvenle saklanır ve üçüncü taraflarla paylaşılmaz.
                      Okuma verileriniz yalnızca size özel istatistikler için kullanılır.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sign Out Button */}
        {user && (
          <Button
            variant="outline"
            className="w-full mt-6"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış Yap
          </Button>
        )}
      </div>
    </div>
  );
};

export default Profile;
