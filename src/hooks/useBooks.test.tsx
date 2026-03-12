import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useBooks, useBook } from './useBooks';

// Mock the module directly in the test file
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock data
const mockBooks = [
  { id: '1', title: 'Book 1', author: 'Author 1', is_club_book: false },
  { id: '2', title: 'Book 2', author: 'Author 2', is_club_book: true },
];

describe('useBooks hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useBooks', () => {
    it('should fetch and return books', async () => {
      // Setup mock implementation for supabase
      const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockBooks, error: null }) });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const { result } = renderHook(() => useBooks(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(supabase.from).toHaveBeenCalledWith('books');
      expect(result.current.data).toEqual(mockBooks);
    });

    it('should handle errors', async () => {
      const dbError = new Error('Database error');
      const selectMock = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: null, error: dbError }) });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const { result } = renderHook(() => useBooks(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(dbError);
    });
  });

  describe('useBook', () => {
    it('should fetch a single book by id', async () => {
      const mockBook = mockBooks[0];
      const eqMock = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockBook, error: null }) });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const { result } = renderHook(() => useBook('1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(supabase.from).toHaveBeenCalledWith('books');
      expect(eqMock).toHaveBeenCalledWith('id', '1');
      expect(result.current.data).toEqual(mockBook);
    });
  });
});
