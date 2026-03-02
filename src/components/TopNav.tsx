import { Bell, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import Avatar from './Avatar';

const TopNav = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(user?.id);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-border">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-serif font-bold text-lg">Kitap Kulübü</span>
        </button>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="hover:opacity-80 transition-opacity"
          >
            {user && profile ? (
              <Avatar
                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                name={profile.display_name || profile.username}
                size="sm"
              />
            ) : (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center border-2 border-border">
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
