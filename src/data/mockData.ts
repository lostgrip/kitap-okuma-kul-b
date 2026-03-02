// Mock data for the Social Book Club app

export interface User {
  id: string;
  name: string;
  avatar_url: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  owner_id: string;
  cover_url: string;
}

export interface ClubCycle {
  id: string;
  book_id: string;
  start_date: string;
  end_date: string;
  target_pages_per_week: number;
}

export interface Progress {
  user_id: string;
  cycle_id: string;
  current_page: number;
  last_updated: string;
}

export interface FeedPost {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  page_reference: number | null;
  type: 'quote' | 'update';
  created_at: string;
}

// Mock Users
export const mockUsers: User[] = [
  { id: '1', name: 'You', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You' },
  { id: '2', name: 'Ahmet', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmet' },
  { id: '3', name: 'Sarah', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: '4', name: 'Marcus', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus' },
  { id: '5', name: 'Elena', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
];

// Mock Books
export const mockBooks: Book[] = [
  {
    id: '1',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    total_pages: 304,
    owner_id: '1',
    cover_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop',
  },
  {
    id: '2',
    title: 'Atomic Habits',
    author: 'James Clear',
    total_pages: 320,
    owner_id: '2',
    cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=450&fit=crop',
  },
  {
    id: '3',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    total_pages: 496,
    owner_id: '3',
    cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=450&fit=crop',
  },
  {
    id: '4',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    total_pages: 256,
    owner_id: '4',
    cover_url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=300&h=450&fit=crop',
  },
  {
    id: '5',
    title: 'Educated',
    author: 'Tara Westover',
    total_pages: 352,
    owner_id: '1',
    cover_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop',
  },
];

// Current Club Cycle (reading The Midnight Library)
export const mockCurrentCycle: ClubCycle = {
  id: '1',
  book_id: '1',
  start_date: '2024-01-15',
  end_date: '2024-02-15',
  target_pages_per_week: 75,
};

// Mock Progress for all users
export const mockProgress: Progress[] = [
  { user_id: '1', cycle_id: '1', current_page: 142, last_updated: '2024-01-22' },
  { user_id: '2', cycle_id: '1', current_page: 137, last_updated: '2024-01-22' },
  { user_id: '3', cycle_id: '1', current_page: 198, last_updated: '2024-01-22' },
  { user_id: '4', cycle_id: '1', current_page: 89, last_updated: '2024-01-21' },
  { user_id: '5', cycle_id: '1', current_page: 165, last_updated: '2024-01-22' },
];

// Mock Feed Posts
export const mockFeedPosts: FeedPost[] = [
  {
    id: '1',
    user_id: '3',
    book_id: '1',
    content: 'Just finished Chapter 15! This book is absolutely captivating. The way Haig writes about regret and possibility is so moving.',
    page_reference: 198,
    type: 'update',
    created_at: '2024-01-22T14:30:00Z',
  },
  {
    id: '2',
    user_id: '2',
    book_id: '1',
    content: '"Between life and death there is a library, and within that library, the shelves go on forever."',
    page_reference: 45,
    type: 'quote',
    created_at: '2024-01-22T12:15:00Z',
  },
  {
    id: '3',
    user_id: '5',
    book_id: '1',
    content: 'Page 165 hit me hard today. Taking a moment to process...',
    page_reference: 165,
    type: 'update',
    created_at: '2024-01-22T10:00:00Z',
  },
  {
    id: '4',
    user_id: '4',
    book_id: '1',
    content: 'Starting my reading journey! Excited to discuss with everyone 📚',
    page_reference: 1,
    type: 'update',
    created_at: '2024-01-21T20:45:00Z',
  },
  {
    id: '5',
    user_id: '3',
    book_id: '1',
    content: '"Every life contains many millions of decisions. Some big, some small. But every time one decision is made, another decision is made."',
    page_reference: 156,
    type: 'quote',
    created_at: '2024-01-21T16:30:00Z',
  },
  {
    id: '6',
    user_id: '1',
    book_id: '1',
    content: 'The library metaphor is so beautiful. Really making me think about my own "what ifs".',
    page_reference: 100,
    type: 'update',
    created_at: '2024-01-20T19:00:00Z',
  },
];

// Helper functions
export const getUserById = (id: string) => mockUsers.find(u => u.id === id);
export const getBookById = (id: string) => mockBooks.find(b => b.id === id);
export const getCurrentBook = () => getBookById(mockCurrentCycle.book_id);
export const getUserProgress = (userId: string) => mockProgress.find(p => p.user_id === userId);
export const getCurrentUserProgress = () => getUserProgress('1');
