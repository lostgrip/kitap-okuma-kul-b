import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LibraryTab from './LibraryTab';

// Mocks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useBooks', () => ({
  useBooks: vi.fn(),
  useAddBook: vi.fn(),
  useDeleteBook: vi.fn(),
  useSubmitBookToClub: vi.fn(),
}));

vi.mock('@/hooks/useBookLists', () => ({
  useBookLists: vi.fn(),
}));

vi.mock('@/hooks/useBookListActions', () => ({
  useAddBookToDefaultList: vi.fn(),
  useAddBookToCustomList: vi.fn(),
}));

vi.mock('@/hooks/useClubSchedule', () => ({
  useClubSchedule: vi.fn(),
}));

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: vi.fn(),
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useIsAdmin: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Component Mocks
vi.mock('./BookCard', () => ({
  default: () => <div data-testid="book-card">BookCard</div>,
}));

vi.mock('./BookSearchDialog', () => ({
  default: () => <div data-testid="book-search-dialog">BookSearchDialog</div>,
}));

vi.mock('./library/AllMyBooksSection', () => ({
  default: () => <div data-testid="all-my-books-section">AllMyBooksSection</div>,
}));

vi.mock('./library/MyLibrarySection', () => ({
  default: () => <div data-testid="my-library-section">MyLibrarySection</div>,
}));

vi.mock('./library/SuggestBookSection', () => ({
  default: () => <div data-testid="suggest-book-section">SuggestBookSection</div>,
}));

import { useAuth } from '@/contexts/AuthContext';
import { useBooks, useAddBook } from '@/hooks/useBooks';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { useBookLists } from '@/hooks/useBookLists';
import { useClubSchedule } from '@/hooks/useClubSchedule';
import { toast } from 'sonner';

describe('LibraryTab Book Upload Integration', () => {
  const mockUser = { id: 'admin1', email: 'admin@example.com' };
  const mockAddBookMutateAsync = vi.fn();
  const mockUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Polyfill for jsdom
    window.scrollTo = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      profile: { username: 'admin1', group_code: 'TEST' },
    } as any);

    vi.mocked(useIsAdmin).mockReturnValue({ data: true } as any);

    vi.mocked(useBooks).mockReturnValue({
      data: [{ id: 'b1', title: 'Test', author: 'Test', page_count: 100, club_status: 'approved', added_by: 'user1' }],
      isLoading: false,
    } as any);

    vi.mocked(useAddBook).mockReturnValue({
      mutateAsync: mockAddBookMutateAsync,
      isPending: false,
    } as any);

    vi.mocked(useFileUpload).mockReturnValue({
      upload: mockUpload,
      isUploading: false,
    } as any);

    // Provide empty lists for other hooks
    vi.mocked(useBookLists).mockReturnValue({ data: [] } as any);

    vi.mocked(useClubSchedule).mockReturnValue({ data: [] } as any);
  });

  const renderComponent = () => render(
    <MemoryRouter>
      <LibraryTab />
    </MemoryRouter>
  );

  it('can upload a cover image and EPUB when adding a new book manually', async () => {
    renderComponent();
    const user = userEvent.setup();

    // Open add dialog
    await user.click(screen.getByRole('button', { name: 'Yeni Kitap Ekle' }));

    // Switch to manual entry
    await user.click(screen.getByText('Bilgileri manuel gir'));

    // Verify form is visible
    expect(screen.getByLabelText(/Kitap Adı/i)).toBeInTheDocument();

    // 1. Fill Text Inputs
    await user.type(screen.getByLabelText(/Kitap Adı/i), 'Yeni Roman');
    await user.type(screen.getByLabelText(/Yazar/i), 'Yazar İsmi');
    await user.type(screen.getByLabelText(/Sayfa/i), '350');

    // 2. Upload Cover Image File
    const fakeCover = new File(['cover content'], 'cover.png', { type: 'image/png' });
    const coverInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    await user.upload(coverInput, fakeCover);

    // 3. Upload EPUB File
    const fakeEpub = new File(['epub content'], 'book.epub', { type: 'application/epub+zip' });
    const epubInput = document.querySelector('input[type="file"][accept=".epub"]') as HTMLInputElement;
    await user.upload(epubInput, fakeEpub);

    // Setup mocks
    mockUpload.mockImplementation((bucket: string, file: File) => {
      if (bucket === 'covers') return Promise.resolve('https://storage/cover.png');
      if (bucket === 'book-files') return Promise.resolve('https://storage/book.epub');
      return Promise.resolve(null);
    });

    mockAddBookMutateAsync.mockResolvedValueOnce({ id: 'new-book-uuid' });

    // Submit
    await user.click(screen.getByRole('button', { name: 'Kitap Ekle' }));

    await waitFor(() => {
      // Expect 2 uploads
      expect(mockUpload).toHaveBeenCalledTimes(2);
      expect(mockUpload).toHaveBeenCalledWith('covers', fakeCover, 'admin1');
      expect(mockUpload).toHaveBeenCalledWith('book-files', fakeEpub);

      // Verify payload
      expect(mockAddBookMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Yeni Roman',
          author: 'Yazar İsmi',
          page_count: 350,
          cover_url: 'https://storage/cover.png',
          epub_url: 'https://storage/book.epub',
          added_by: 'admin1',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Kitap eklendi!');
    });
  });
});
