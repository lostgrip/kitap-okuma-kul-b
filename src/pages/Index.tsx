import { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import TopNav from '@/components/TopNav';
import CurrentReadTab from '@/components/CurrentReadTab';
import LibraryTab from '@/components/LibraryTab';
import SocialFeedTab from '@/components/SocialFeedTab';

type Tab = 'current' | 'library' | 'feed';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('current');

  const renderTab = () => {
    switch (activeTab) {
      case 'current':
        return <CurrentReadTab />;
      case 'library':
        return <LibraryTab />;
      case 'feed':
        return <SocialFeedTab />;
      default:
        return <CurrentReadTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="max-w-lg mx-auto">
        {renderTab()}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
