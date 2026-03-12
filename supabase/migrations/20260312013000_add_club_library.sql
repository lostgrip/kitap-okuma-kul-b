-- Migration to add is_club_book, publisher, and club_book_suggestions table

-- 1. Add is_club_book and publisher to books
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS is_club_book BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS publisher TEXT;

-- Make all existing books club books so we don't lose the existing library
UPDATE public.books SET is_club_book = true WHERE is_club_book = false;

-- 2. Create club_book_suggestions table
CREATE TABLE IF NOT EXISTS public.club_book_suggestions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_code TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_book_suggestions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for club_book_suggestions
CREATE POLICY "Users can view suggestions for their group"
    ON public.club_book_suggestions FOR SELECT
    TO authenticated
    USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can insert suggestions for their group"
    ON public.club_book_suggestions FOR INSERT
    TO authenticated
    WITH CHECK (group_code = get_user_group_code(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update their own pending suggestions"
    ON public.club_book_suggestions FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update suggestions"
    ON public.club_book_suggestions FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()));

CREATE POLICY "Users can delete their own pending suggestions"
    ON public.club_book_suggestions FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can delete suggestions"
    ON public.club_book_suggestions FOR DELETE
    TO authenticated
    USING (is_admin(auth.uid()));

-- 4. Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_club_book_suggestions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_club_book_suggestions_updated_at ON public.club_book_suggestions;
CREATE TRIGGER tr_club_book_suggestions_updated_at
  BEFORE UPDATE ON public.club_book_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_club_book_suggestions_updated_at();
