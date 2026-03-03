
-- Create book_votes table
CREATE TABLE public.book_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(book_id, user_id)
);
ALTER TABLE public.book_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view votes in their group" ON public.book_votes FOR SELECT USING (group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Users can insert their own votes" ON public.book_votes FOR INSERT WITH CHECK (auth.uid() = user_id AND group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Users can delete their own votes" ON public.book_votes FOR DELETE USING (auth.uid() = user_id);

-- Create club_announcements table
CREATE TABLE public.club_announcements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_code TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view announcements in their group" ON public.club_announcements FOR SELECT USING (group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Admins can create announcements" ON public.club_announcements FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') AND group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Admins can delete announcements" ON public.club_announcements FOR DELETE USING (has_role(auth.uid(), 'admin') AND group_code = get_user_group_code(auth.uid()));

-- Create club_schedule table
CREATE TABLE public.club_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    group_code TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.club_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view schedule in their group" ON public.club_schedule FOR SELECT USING (group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Admins can create schedule" ON public.club_schedule FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') AND group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Admins can update schedule" ON public.club_schedule FOR UPDATE USING (has_role(auth.uid(), 'admin') AND group_code = get_user_group_code(auth.uid()));
CREATE POLICY "Admins can delete schedule" ON public.club_schedule FOR DELETE USING (has_role(auth.uid(), 'admin') AND group_code = get_user_group_code(auth.uid()));

-- Create book_discussions table
CREATE TABLE public.book_discussions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.book_discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    has_spoiler BOOLEAN NOT NULL DEFAULT false,
    page_reference INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.book_discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view discussions" ON public.book_discussions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = book_discussions.user_id AND (p.group_code IS NULL OR p.group_code = get_user_group_code(auth.uid())))
);
CREATE POLICY "Users can create discussions" ON public.book_discussions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own discussions" ON public.book_discussions FOR DELETE USING (auth.uid() = user_id);

-- Create reading_log table
CREATE TABLE public.reading_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    pages_read INTEGER NOT NULL DEFAULT 0,
    current_page INTEGER NOT NULL DEFAULT 0,
    logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.reading_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own log" ON public.reading_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own log" ON public.reading_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_club_schedule_updated_at BEFORE UPDATE ON public.club_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_discussions_updated_at BEFORE UPDATE ON public.book_discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
