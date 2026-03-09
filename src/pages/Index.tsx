import { useState, lazy, Suspense, useCallback } from 'react';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import { Loader2 } from 'lucide-react';

// Lazy load heavy tab components — only the active tab is loaded
const CurrentReadTab = lazy(() => import('@/components/CurrentReadTab'));
const LibraryTab = lazy(() => import('@/components/LibraryTab'));
const SocialFeedTab = lazy(() => import('@/components/SocialFeedTab'));

type Tab = 'current' | 'library' | 'feed';

const TabFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const savedTab = sessionStorage.getItem('activeTab') as Tab | null;
    return savedTab || 'current';
  });

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem('activeTab', tab);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="max-w-lg mx-auto">
        <Suspense fallback={<TabFallback />}>
          {activeTab === 'current' && <CurrentReadTab />}
          {activeTab === 'library' && <LibraryTab />}
          {activeTab === 'feed' && <SocialFeedTab />}
        </Suspense>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
