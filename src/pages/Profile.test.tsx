import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';

// Mock UI & hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useGoals', () => ({
  useGoals: vi.fn(),
  useUpsertGoal: vi.fn(),
}));

vi.mock('@/hooks/useProgress', () => ({
  useUserProgress: vi.fn(),
}));

vi.mock('@/hooks/useBooks', () => ({
  useBooks: vi.fn(),
}));

vi.mock('@/hooks/useReadingLog', () => ({
  useReadingLog: vi.fn(),
}));

vi.mock('@/hooks/useFeedback', () => ({
  useSubmitFeedback: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/contexts/AuthContext';
import { useGoals, useUpsertGoal } from '@/hooks/useGoals';
import { useUserProgress } from '@/hooks/useProgress';
import { useReadingLog } from '@/hooks/useReadingLog';
import { useBooks } from '@/hooks/useBooks';
import { toast } from 'sonner';

describe('Profile Component (Settings, Goals, Statistics)', () => {
  const mockUser = { id: 'user1' };
  const mockProfile = { username: 'testuser', display_name: 'Test O. User' };
  const mockUpsertGoal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      signOut: vi.fn(),
    } as any);

    vi.mocked(useUpsertGoal).mockReturnValue({
      mutateAsync: mockUpsertGoal,
      isPending: false,
    } as any);

    vi.mocked(useGoals).mockReturnValue({
      data: [
        { goal_type: 'daily', target_pages: 50, target_books: 0 },
        { goal_type: 'weekly', target_pages: 350, target_books: 1 }
      ],
      isLoading: false,
    } as any);

    // Mock progress to verify stats reading calculations
    vi.mocked(useUserProgress).mockReturnValue({
      data: [
        { book_id: 'b1', status: 'reading', current_page: 80 },
        { book_id: 'b2', status: 'completed', current_page: 300 },
        { book_id: 'b3', status: 'completed', current_page: 250 },
      ],
    } as any);

    vi.mocked(useReadingLog).mockReturnValue({
      data: [],
    } as any);

    vi.mocked(useBooks).mockReturnValue({ data: [] } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

  it('renders user details and quick stats accurately', () => {
    renderComponent();
    
    // User profile
    expect(screen.getByText('Test O. User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();

    // Quick Stats based on the mocked useUserProgress
    // We expect: 1 reading, 2 completed, 80+300+250 = 630 pages total
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Okunan')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Tamamlanan')).toBeInTheDocument();
    expect(screen.getByText('630')).toBeInTheDocument();
    expect(screen.getByText('Sayfa')).toBeInTheDocument();
  });

  it('displays existing habit goals', () => {
    renderComponent();
    expect(screen.getByText('Günlük Hedef')).toBeInTheDocument();
    expect(screen.getByText('50 sayfa')).toBeInTheDocument();
    expect(screen.getByText('Haftalık Hedef')).toBeInTheDocument();
    expect(screen.getByText(/350 sayfa • 1 kitap/i)).toBeInTheDocument();
    expect(screen.getByText('Aylık Hedef')).toBeInTheDocument();
    expect(screen.getByText('Hedef belirlenmedi')).toBeInTheDocument();
  });

  it('submits a new goal successfully', async () => {
    renderComponent();
    const user = userEvent.setup();

    // Open Goal dialog
    await user.click(screen.getByRole('button', { name: /hedef ekle/i }));

    // The dialog contents appear
    await waitFor(() => {
      expect(screen.getByText('Hedef Belirle')).toBeInTheDocument();
    });

    // Pick "Aylık" goal type. Note: Radix UI selects mock testing can be tricky, 
    // so we will trust the default (daily) for now or trigger typing in the form.
    await user.type(screen.getByPlaceholderText('Örn: 30'), '1000'); // pages
    await user.type(screen.getByPlaceholderText('Örn: 1'), '3');    // books

    mockUpsertGoal.mockResolvedValueOnce({});

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    // Checking if mutation was called correctly
    await waitFor(() => {
      expect(mockUpsertGoal).toHaveBeenCalledWith({
        user_id: 'user1',
        goal_type: 'daily',
        target_pages: 1000,
        target_books: 3,
      });
      expect(toast.success).toHaveBeenCalledWith('Hedef kaydedildi!');
    });
  });
});
