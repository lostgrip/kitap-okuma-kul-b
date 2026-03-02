-- PHASE 1: Core Schema Updates for Fable-like Platform

-- Add group_code and is_admin to profiles
ALTER TABLE public.profiles 
ADD COLUMN group_code TEXT,
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for group_code lookups
CREATE INDEX idx_profiles_group_code ON public.profiles(group_code);

-- Add epub_url to books table
ALTER TABLE public.books 
ADD COLUMN epub_url TEXT;

-- Create user_books table for reading progress with last_location
CREATE TABLE public.user_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'want_to_read',
  last_location TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS on user_books
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;

-- PHASE 3: Book Lists System
CREATE TABLE public.book_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_community BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  list_type TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.book_lists ENABLE ROW LEVEL SECURITY;

-- Book list items junction table
CREATE TABLE public.book_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.book_lists(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, book_id)
);

ALTER TABLE public.book_list_items ENABLE ROW LEVEL SECURITY;

-- PHASE 4: Notifications System
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User notification preferences
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  new_book_notifications BOOLEAN NOT NULL DEFAULT true,
  social_notifications BOOLEAN NOT NULL DEFAULT true,
  goal_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Book reviews table (1-10 rating)
CREATE TABLE public.book_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

-- Quote of the day table
CREATE TABLE public.daily_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_code TEXT NOT NULL,
  user_id UUID NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  quote_text TEXT NOT NULL,
  author TEXT,
  featured_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER function to get user's group_code safely
CREATE OR REPLACE FUNCTION public.get_user_group_code(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_code FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- SECURITY DEFINER function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS POLICIES FOR ALL TABLES

-- User Books: Users can only see their own entries
CREATE POLICY "Users can view their own user_books"
  ON public.user_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user_books"
  ON public.user_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own user_books"
  ON public.user_books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own user_books"
  ON public.user_books FOR DELETE
  USING (auth.uid() = user_id);

-- Book Lists: Users see their own + approved community lists in their group
CREATE POLICY "Users can view own and approved community lists"
  ON public.book_lists FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (is_community = true AND is_approved = true AND group_code = public.get_user_group_code(auth.uid()))
  );

CREATE POLICY "Users can create their own lists"
  ON public.book_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
  ON public.book_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON public.book_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Book List Items: Access based on list access
CREATE POLICY "Users can view list items for accessible lists"
  ON public.book_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.book_lists 
      WHERE id = list_id 
      AND (user_id = auth.uid() OR (is_community = true AND is_approved = true AND group_code = public.get_user_group_code(auth.uid())))
    )
  );

CREATE POLICY "Users can add items to their own lists"
  ON public.book_list_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.book_lists WHERE id = list_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can remove items from their own lists"
  ON public.book_list_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.book_lists WHERE id = list_id AND user_id = auth.uid())
  );

-- Notifications: Users only see their own
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Notification Settings: Users only manage their own
CREATE POLICY "Users can view their own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Book Reviews: Public read, users manage their own
CREATE POLICY "Anyone can view book reviews"
  ON public.book_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON public.book_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.book_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.book_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Quotes: Group-based access
CREATE POLICY "Users can view quotes in their group"
  ON public.daily_quotes FOR SELECT
  USING (group_code = public.get_user_group_code(auth.uid()));

CREATE POLICY "Users can create quotes in their group"
  ON public.daily_quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND group_code = public.get_user_group_code(auth.uid()));

-- Update profiles RLS to allow group_code filtering
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their group"
  ON public.profiles FOR SELECT
  USING (
    group_code IS NULL 
    OR group_code = public.get_user_group_code(auth.uid())
    OR auth.uid() = user_id
  );

-- Update books RLS to be group-aware (via added_by user's group)
DROP POLICY IF EXISTS "Authenticated users can view all books" ON public.books;
CREATE POLICY "Users can view books in their group"
  ON public.books FOR SELECT
  USING (
    added_by IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = books.added_by 
      AND (p.group_code IS NULL OR p.group_code = public.get_user_group_code(auth.uid()))
    )
  );

-- Update feed_posts RLS to be group-aware
DROP POLICY IF EXISTS "Authenticated users can view all posts" ON public.feed_posts;
CREATE POLICY "Users can view posts in their group"
  ON public.feed_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = feed_posts.user_id 
      AND (p.group_code IS NULL OR p.group_code = public.get_user_group_code(auth.uid()))
    )
  );

-- Update reading_progress RLS to be group-aware for viewing
DROP POLICY IF EXISTS "Users can view all reading progress" ON public.reading_progress;
CREATE POLICY "Users can view reading progress in their group"
  ON public.reading_progress FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = reading_progress.user_id 
      AND p.group_code = public.get_user_group_code(auth.uid())
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_user_books_updated_at
  BEFORE UPDATE ON public.user_books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_book_lists_updated_at
  BEFORE UPDATE ON public.book_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_book_reviews_updated_at
  BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default lists for new users
CREATE OR REPLACE FUNCTION public.create_default_lists_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.book_lists (user_id, group_code, name, is_default, list_type)
  VALUES 
    (NEW.user_id, NEW.group_code, 'Okumak İstiyorum', true, 'want_to_read'),
    (NEW.user_id, NEW.group_code, 'Okuyorum', true, 'reading'),
    (NEW.user_id, NEW.group_code, 'Okudum', true, 'read'),
    (NEW.user_id, NEW.group_code, 'Yarıda Bıraktım', true, 'dnf');
  
  -- Create default notification settings
  INSERT INTO public.notification_settings (user_id) VALUES (NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Trigger to create default lists when profile is created
CREATE TRIGGER on_profile_created_create_defaults
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_lists_for_user();

-- Create storage buckets for covers and book files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('book-files', 'book-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for covers (public read, authenticated write)
CREATE POLICY "Covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Authenticated users can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

-- Storage policies for book files (group-based access)
CREATE POLICY "Users can view book files in their group"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'book-files' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload book files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'book-files' AND auth.uid() IS NOT NULL);