import { BookOpen, Library, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'current' | 'library' | 'feed';
  onTabChange: (tab: 'current' | 'library' | 'feed') => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: 'current' as const, label: 'Şu Anda', icon: BookOpen },
    { id: 'library' as const, label: 'Kütüphane', icon: Library },
    { id: 'feed' as const, label: 'Sosyal', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/50 z-50 pb-safe">
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
              <Icon
                className={cn(
                  'w-5 h-5 transition-all duration-200',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={cn(
                  'text-[11px] mt-1 font-medium transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-60'
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
