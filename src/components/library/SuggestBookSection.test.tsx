import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuggestBookSection from './SuggestBookSection';

// Need to mock the hooks before importing
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useIsAdmin: vi.fn(),
}));

vi.mock('@/hooks/useBooks', () => ({
  useClubBookSuggestions: vi.fn(),
  useUpdateClubBookSuggestion: vi.fn(),
}));

// Also mock sonner toast because it's called on success/error
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import the mocked hooks so we can change their return values
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useClubBookSuggestions, useUpdateClubBookSuggestion } from '@/hooks/useBooks';

describe('SuggestBookSection Integration', () => {
  const mockSuggestions = [
    {
      id: 's1',
      title: 'Pending Book',
      author: 'Author A',
      status: 'pending',
      cover_url: null,
    },
    {
      id: 's2',
      title: 'Approved Book',
      author: 'Author B',
      status: 'approved',
      cover_url: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user1' } } as any);
    vi.mocked(useIsAdmin).mockReturnValue({ data: false } as any);
    vi.mocked(useClubBookSuggestions).mockReturnValue({
      data: mockSuggestions,
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useUpdateClubBookSuggestion).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <SuggestBookSection />
    </MemoryRouter>
  );

  it('renders loading state', () => {
    vi.mocked(useClubBookSuggestions).mockReturnValue({
      data: [], isLoading: true, isError: false,
    } as any);

    renderComponent();
    // Loader circle is rendered, difficult to get by role without aria-label, but we can check it's not showing books
    expect(screen.queryByText('Önerilen Kitaplar')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useClubBookSuggestions).mockReturnValue({
      data: [], isLoading: false, isError: true,
    } as any);

    renderComponent();
    expect(screen.getByText('Öneriler yüklenemedi.')).toBeInTheDocument();
  });

  it('renders null if empty', () => {
    vi.mocked(useClubBookSuggestions).mockReturnValue({
      data: [], isLoading: false, isError: false,
    } as any);

    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the list of suggestions', () => {
    renderComponent();
    
    expect(screen.getByText('Pending Book')).toBeInTheDocument();
    expect(screen.getByText('Approved Book')).toBeInTheDocument();
    expect(screen.getByText('Bekliyor')).toBeInTheDocument();
    expect(screen.getByText('Onaylandı')).toBeInTheDocument();
    
    // As a normal user, you shouldn't see approval/rejection buttons for pending books
    expect(screen.queryByRole('button', { name: /onayla/i })).not.toBeInTheDocument();
  });

  it('renders admin controls for pending suggestions', async () => {
    // Set user as admin
    vi.mocked(useIsAdmin).mockReturnValue({ data: true } as any);
    
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateClubBookSuggestion).mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as any);

    renderComponent();

    const approveButton = screen.getByRole('button', { name: /onayla/i });
    const rejectButton = screen.getByRole('button', { name: /reddet/i });

    expect(approveButton).toBeInTheDocument();
    expect(rejectButton).toBeInTheDocument();

    // Click approve
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ id: 's1', status: 'approved' });
    });
  });
});
