import { Bell, SwatchBook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import Avatar from './Avatar';

const TopNav = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <SwatchBook className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-lg font-bold text-foreground">Kitap İmecesi</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-xl hover:bg-muted transition-colors duration-200"
          >
            <Bell className="w-[18px] h-[18px] text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="p-1 rounded-xl hover:bg-muted transition-colors duration-200"
          >
            {user && profile ? (
              <Avatar
                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                name={profile.display_name || profile.username}
                size="sm"
              />
            ) : (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">?</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
