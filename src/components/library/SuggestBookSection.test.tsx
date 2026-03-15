import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuggestBookSection from './SuggestBookSection';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useIsAdmin: vi.fn(),
}));

vi.mock('@/hooks/useBooks', () => ({
  usePendingClubBooks: vi.fn(),
  useApproveClubBook: vi.fn(),
  useDeleteBook: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { usePendingClubBooks, useApproveClubBook, useDeleteBook } from '@/hooks/useBooks';

describe('SuggestBookSection Integration', () => {
  const mockPendingBooks = [
    {
      id: 's1',
      title: 'Pending Book',
      author: 'Author A',
      club_status: 'pending',
      cover_url: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user1' } } as any);
    vi.mocked(useIsAdmin).mockReturnValue({ data: false } as any);
    vi.mocked(usePendingClubBooks).mockReturnValue({
      data: mockPendingBooks,
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useApproveClubBook).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
    vi.mocked(useDeleteBook).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <SuggestBookSection />
    </MemoryRouter>
  );

  it('renders null if empty', () => {
    vi.mocked(usePendingClubBooks).mockReturnValue({
      data: [], isLoading: false, isError: false,
    } as any);

    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the list of pending suggestions', () => {
    renderComponent();
    
    expect(screen.getByText('Pending Book')).toBeInTheDocument();
    expect(screen.getByText('Bekliyor')).toBeInTheDocument();
  });

  it('renders admin controls for pending suggestions', async () => {
    vi.mocked(useIsAdmin).mockReturnValue({ data: true } as any);

    renderComponent();

    expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reddet/i })).toBeInTheDocument();
  });
});
