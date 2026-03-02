
-- Add club_status column to books table
-- null = not submitted to club, 'pending' = awaiting admin approval, 'approved' = visible in club library
ALTER TABLE public.books ADD COLUMN club_status text DEFAULT NULL;

-- Add index for filtering club books
CREATE INDEX idx_books_club_status ON public.books (club_status) WHERE club_status IS NOT NULL;
