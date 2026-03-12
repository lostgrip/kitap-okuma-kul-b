import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddBookToDefaultList } from '@/hooks/useBookListActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('SocialLibrarySync Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user-id' },
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('invalidates user_books, reading_progress and book_list_items when a book is added to a shelf', async () => {
    // Chainable mock builder
    const createChainableMock = (resolvedValue: any) => {
      const mockObj: any = {};
      const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'single', 'maybeSingle', 'upsert'];
      methods.forEach(method => {
        mockObj[method] = vi.fn(() => mockObj);
      });
      // Override the terminal methods to return the promise
      mockObj.single = vi.fn().mockResolvedValue(resolvedValue);
      mockObj.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
      mockObj.upsert = vi.fn().mockResolvedValue(resolvedValue);
      mockObj.insert = vi.fn().mockResolvedValue(resolvedValue);
      mockObj.delete = vi.fn(() => mockObj);
      // for delete().eq().eq() we need the last eq to resolve or just make eq return promise
      // In supabase, delete/update without select resolve. With select they return chain.
      // We will just mock the specific queries needed by returning a custom object from .from()
    };

    const profileMockObj = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { group_code: 'TEST' }, error: null })
    };

    const listsMockObj = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // for .eq().eq() returning data
      then: function(resolve: any) { resolve({ data: [{ id: 'list-1', list_type: 'reading', group_code: 'TEST' }], error: null }); }
    };

    const upsertMockObj = {
      upsert: vi.fn().mockResolvedValue({ error: null })
    };

    const bookListItemsMockObj = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: function(resolve: any) { resolve({ error: null }); } // For the delete chain
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return profileMockObj as any;
      if (table === 'book_lists') return listsMockObj as any;
      if (table === 'user_books') return upsertMockObj as any;
      if (table === 'reading_progress') return upsertMockObj as any;
      if (table === 'book_list_items') return bookListItemsMockObj as any;
      return {} as any;
    });

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddBookToDefaultList(), { wrapper });

    await result.current.mutateAsync({ bookId: 'book-123', listType: 'reading' });

    // Verification: ensure the mutation succeeded and triggered global invalidations
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['book_list_items'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reading_progress'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user_books'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['book_in_lists'] });
    });
  });
});
