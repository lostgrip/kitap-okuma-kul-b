-- =====================================================
-- Feature Improvements: Discussions, Schedule, Log,
--                        Votes, Announcements, Bio
-- =====================================================

-- 1. Add bio column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Club reading schedule table
CREATE TABLE IF NOT EXISTS public.club_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  group_code TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | active | finished
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.club_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedule in their group"
  ON public.club_schedule FOR SELECT
  USING (group_code = public.get_user_group_code(auth.uid()));

CREATE POLICY "Admins can manage schedule"
  ON public.club_schedule FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- 3. Book discussions table (per-book threads)
CREATE TABLE IF NOT EXISTS public.book_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.book_discussions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  has_spoiler BOOLEAN NOT NULL DEFAULT false,
  page_reference INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discussions in their group"
  ON public.book_discussions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = book_discussions.user_id
      AND (p.group_code IS NULL OR p.group_code = public.get_user_group_code(auth.uid()))
    )
  );

CREATE POLICY "Users can create discussions"
  ON public.book_discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions"
  ON public.book_discussions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions"
  ON public.book_discussions FOR DELETE
  USING (auth.uid() = user_id OR public.is_user_admin(auth.uid()));

-- 4. Reading log table (timestamped sessions for journal/calendar/streak)
CREATE TABLE IF NOT EXISTS public.reading_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  pages_read INTEGER NOT NULL DEFAULT 0,
  current_page INTEGER NOT NULL DEFAULT 0,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading log"
  ON public.reading_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading log"
  ON public.reading_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Book votes table (vote for next club read)
CREATE TABLE IF NOT EXISTS public.book_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  group_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes in their group"
  ON public.book_votes FOR SELECT
  USING (group_code = public.get_user_group_code(auth.uid()));

CREATE POLICY "Users can vote"
  ON public.book_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND group_code = public.get_user_group_code(auth.uid()));

CREATE POLICY "Users can remove their own vote"
  ON public.book_votes FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Club announcements table
CREATE TABLE IF NOT EXISTS public.club_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_code TEXT NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view announcements in their group"
  ON public.club_announcements FOR SELECT
  USING (group_code = public.get_user_group_code(auth.uid()));

CREATE POLICY "Admins can manage announcements"
  ON public.club_announcements FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Triggers
CREATE TRIGGER update_club_schedule_updated_at
  BEFORE UPDATE ON public.club_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_book_discussions_updated_at
  BEFORE UPDATE ON public.book_discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
