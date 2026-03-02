import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, BookOpen, Users, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, React.ReactNode> = {
  new_book: <BookOpen className="w-4 h-4" />,
  social: <Users className="w-4 h-4" />,
  goal: <Target className="w-4 h-4" />,
  default: <Bell className="w-4 h-4" />,
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkAllRead = () => {
    if (user) {
      markAllRead.mutate(user.id);
    }
  };

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(notificationId);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Geri
        </Button>
        <div className="text-center py-16">
          <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Bildirimleri görmek için giriş yapın</p>
          <Button className="mt-4" onClick={() => navigate('/auth')}>
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-serif font-bold text-lg">Bildirimler</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{unreadCount} okunmamış</p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <Check className="w-4 h-4 mr-1" />
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Henüz bildiriminiz yok</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                className={cn(
                  "w-full text-left px-4 py-4 flex gap-3 transition-colors hover:bg-muted/50",
                  !notification.is_read && "bg-accent/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  !notification.is_read ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {notificationIcons[notification.type] || notificationIcons.default}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm",
                    !notification.is_read && "font-medium"
                  )}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true,
                      locale: tr 
                    })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
