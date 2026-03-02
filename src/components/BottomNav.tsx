import { BookOpen, Library, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'current' | 'library' | 'feed';
  onTabChange: (tab: 'current' | 'library' | 'feed') => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: 'current' as const, label: 'Current Read', icon: BookOpen },
    { id: 'library' as const, label: 'Library', icon: Library },
    { id: 'feed' as const, label: 'Social', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200',
                'active:scale-95 touch-manipulation',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
                  isActive && 'bg-accent'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isActive && 'scale-110'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  'text-xs mt-0.5 font-medium transition-all duration-200',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
