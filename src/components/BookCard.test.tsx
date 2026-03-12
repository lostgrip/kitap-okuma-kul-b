import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import BookCard from './BookCard';

// Mock getOptimizedCoverUrl as it might do complex logic not suitable for jsdom
vi.mock('@/lib/imageUtils', () => ({
  getOptimizedCoverUrl: (url: string | null) => url || 'fallback-url',
}));

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BookCard', () => {
  const mockBook = {
    id: '123',
    title: 'Test Book Title',
    author: 'Test Author',
    cover_url: 'http://example.com/cover.jpg',
  };

  it('renders correctly with given book data', () => {
    render(
      <MemoryRouter>
        <BookCard book={mockBook} />
      </MemoryRouter>
    );

    // Verify title and author
    expect(screen.getByText('Test Book Title')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();

    // Verify image
    const image = screen.getByAltText('Test Book Title');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'http://example.com/cover.jpg');
  });

  it('navigates to book details on click', () => {
    render(
      <MemoryRouter>
        <BookCard book={mockBook} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/book/123',
      expect.objectContaining({
        state: expect.objectContaining({
          from: expect.any(String),
        }),
      })
    );
  });

  it('renders the club book icon when isClubBook is true', () => {
    const { container } = render(
      <MemoryRouter>
        <BookCard book={mockBook} isClubBook={true} />
      </MemoryRouter>
    );

    // Look for the Crown icon wrapper (since lucide-react renders SVGs)
    // The wrapper has class 'absolute top-1.5 left-1.5'
    const crownWrapper = container.querySelector('.absolute.top-1\\.5.left-1\\.5');
    expect(crownWrapper).toBeInTheDocument();
  });

  it('renders the owner name when showOwner is true and ownerName is provided', () => {
    render(
      <MemoryRouter>
        <BookCard book={mockBook} showOwner={true} ownerName="Alice Admin" />
      </MemoryRouter>
    );

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
  });
});
