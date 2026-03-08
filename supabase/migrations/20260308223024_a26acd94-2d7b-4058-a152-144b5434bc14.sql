
-- ============================================================
-- Convert ALL RESTRICTIVE policies to PERMISSIVE across all tables
-- Also fix ungrouped user data exposure
-- ============================================================

-- ======================== PROFILES ========================
DROP POLICY IF EXISTS "Users can view profiles in their group" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their group" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== BOOKS ========================
DROP POLICY IF EXISTS "Users can view books in their group" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can add books" ON public.books;
DROP POLICY IF EXISTS "Users can update books they added or admins can update" ON public.books;
DROP POLICY IF EXISTS "Users can delete books they added or admins can delete" ON public.books;

CREATE POLICY "Users can view books in their group" ON public.books
  FOR SELECT TO authenticated
  USING (
    auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = books.added_by
      AND p.group_code = get_user_group_code(auth.uid())
    )
    OR (added_by IS NULL AND auth.uid() IS NOT NULL)
  );

CREATE POLICY "Authenticated users can add books" ON public.books
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update books they added or admins can update" ON public.books
  FOR UPDATE TO authenticated
  USING (auth.uid() = added_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete books they added or admins can delete" ON public.books
  FOR DELETE TO authenticated
  USING (auth.uid() = added_by OR has_role(auth.uid(), 'admin'::app_role));

-- ======================== BOOK_DISCUSSIONS ========================
DROP POLICY IF EXISTS "Users can view discussions" ON public.book_discussions;
DROP POLICY IF EXISTS "Users can create discussions" ON public.book_discussions;
DROP POLICY IF EXISTS "Users can delete their own discussions" ON public.book_discussions;

CREATE POLICY "Users can view discussions" ON public.book_discussions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = book_discussions.user_id
      AND p.group_code = get_user_group_code(auth.uid())
    )
  );

CREATE POLICY "Users can create discussions" ON public.book_discussions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions" ON public.book_discussions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== BOOK_REVIEWS ========================
DROP POLICY IF EXISTS "Users can view reviews in their group" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.book_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.book_reviews;

CREATE POLICY "Users can view reviews in their group" ON public.book_reviews
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = book_reviews.user_id
      AND p.group_code = get_user_group_code(auth.uid())
    )
  );

CREATE POLICY "Users can create their own reviews" ON public.book_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.book_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.book_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== FEED_POSTS ========================
DROP POLICY IF EXISTS "Users can view posts in their group" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.feed_posts;

CREATE POLICY "Users can view posts in their group" ON public.feed_posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = feed_posts.user_id
      AND p.group_code = get_user_group_code(auth.uid())
    )
  );

CREATE POLICY "Users can create their own posts" ON public.feed_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.feed_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.feed_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== BOOK_VOTES ========================
DROP POLICY IF EXISTS "Users can view votes in their group" ON public.book_votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.book_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.book_votes;

CREATE POLICY "Users can view votes in their group" ON public.book_votes
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can insert their own votes" ON public.book_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.book_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== BOOK_LISTS ========================
DROP POLICY IF EXISTS "Users can view own and approved community lists" ON public.book_lists;
DROP POLICY IF EXISTS "Users can create their own lists" ON public.book_lists;
DROP POLICY IF EXISTS "Users can update their own lists or admins can approve" ON public.book_lists;
DROP POLICY IF EXISTS "Users can delete their own lists" ON public.book_lists;

CREATE POLICY "Users can view own and approved community lists" ON public.book_lists
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (is_community = true AND is_approved = true AND group_code = get_user_group_code(auth.uid())));

CREATE POLICY "Users can create their own lists" ON public.book_lists
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists or admins can approve" ON public.book_lists
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid())));

CREATE POLICY "Users can delete their own lists" ON public.book_lists
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== BOOK_LIST_ITEMS ========================
DROP POLICY IF EXISTS "Users can view list items for accessible lists" ON public.book_list_items;
DROP POLICY IF EXISTS "Users can add items to their own lists" ON public.book_list_items;
DROP POLICY IF EXISTS "Users can remove items from their own lists" ON public.book_list_items;

CREATE POLICY "Users can view list items for accessible lists" ON public.book_list_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM book_lists
    WHERE book_lists.id = book_list_items.list_id
    AND (book_lists.user_id = auth.uid() OR (book_lists.is_community = true AND book_lists.is_approved = true AND book_lists.group_code = get_user_group_code(auth.uid())))
  ));

CREATE POLICY "Users can add items to their own lists" ON public.book_list_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM book_lists WHERE book_lists.id = book_list_items.list_id AND book_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove items from their own lists" ON public.book_list_items
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM book_lists WHERE book_lists.id = book_list_items.list_id AND book_lists.user_id = auth.uid()
  ));

-- ======================== BOOK_NOTES ========================
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.book_notes;

CREATE POLICY "Users can manage their own notes" ON public.book_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ======================== CLUB_ANNOUNCEMENTS ========================
DROP POLICY IF EXISTS "Users can view announcements in their group" ON public.club_announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON public.club_announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.club_announcements;

CREATE POLICY "Users can view announcements in their group" ON public.club_announcements
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Admins can create announcements" ON public.club_announcements
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Admins can delete announcements" ON public.club_announcements
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

-- ======================== CLUB_SCHEDULE ========================
DROP POLICY IF EXISTS "Users can view schedule in their group" ON public.club_schedule;
DROP POLICY IF EXISTS "Admins can create schedule" ON public.club_schedule;
DROP POLICY IF EXISTS "Admins can update schedule" ON public.club_schedule;
DROP POLICY IF EXISTS "Admins can delete schedule" ON public.club_schedule;

CREATE POLICY "Users can view schedule in their group" ON public.club_schedule
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Admins can create schedule" ON public.club_schedule
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Admins can update schedule" ON public.club_schedule
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Admins can delete schedule" ON public.club_schedule
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

-- ======================== DAILY_QUOTES ========================
DROP POLICY IF EXISTS "Users can view quotes in their group" ON public.daily_quotes;
DROP POLICY IF EXISTS "Users can create quotes in their group" ON public.daily_quotes;

CREATE POLICY "Users can view quotes in their group" ON public.daily_quotes
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can create quotes in their group" ON public.daily_quotes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND group_code = get_user_group_code(auth.uid()));

-- ======================== FEEDBACK ========================
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

CREATE POLICY "Authenticated users can submit feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "Users can view their own feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- ======================== GROUP_INVITE_CODES ========================
DROP POLICY IF EXISTS "Admins can view their group invite codes" ON public.group_invite_codes;
DROP POLICY IF EXISTS "Admins can create invite codes" ON public.group_invite_codes;
DROP POLICY IF EXISTS "Admins can update invite codes" ON public.group_invite_codes;
DROP POLICY IF EXISTS "Admins can delete invite codes" ON public.group_invite_codes;

CREATE POLICY "Admins can view their group invite codes" ON public.group_invite_codes
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create invite codes" ON public.group_invite_codes
  FOR INSERT TO authenticated
  WITH CHECK (group_code = get_user_group_code(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Admins can update invite codes" ON public.group_invite_codes
  FOR UPDATE TO authenticated
  USING (group_code = get_user_group_code(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invite codes" ON public.group_invite_codes
  FOR DELETE TO authenticated
  USING (group_code = get_user_group_code(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- ======================== GROUPS ========================
DROP POLICY IF EXISTS "Users can view their own group" ON public.groups;
DROP POLICY IF EXISTS "Admins can create groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;

CREATE POLICY "Users can view their own group" ON public.groups
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update groups" ON public.groups
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete groups" ON public.groups
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ======================== NOTIFICATION_SETTINGS ========================
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can insert their own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.notification_settings;

CREATE POLICY "Users can view their own notification settings" ON public.notification_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON public.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== NOTIFICATIONS ========================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications for anyone" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for themselves" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications for anyone" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== READING_GOALS ========================
DROP POLICY IF EXISTS "Users can view their own goals" ON public.reading_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.reading_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.reading_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.reading_goals;

CREATE POLICY "Users can view their own goals" ON public.reading_goals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.reading_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.reading_goals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.reading_goals
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== READING_LOG ========================
DROP POLICY IF EXISTS "Users can view their own log" ON public.reading_log;
DROP POLICY IF EXISTS "Users can insert their own log" ON public.reading_log;

CREATE POLICY "Users can view their own log" ON public.reading_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own log" ON public.reading_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ======================== READING_PROGRESS ========================
DROP POLICY IF EXISTS "Users can view reading progress in their group" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.reading_progress;

CREATE POLICY "Users can view reading progress in their group" ON public.reading_progress
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = reading_progress.user_id
      AND p.group_code = get_user_group_code(auth.uid())
    )
  );

CREATE POLICY "Users can insert their own progress" ON public.reading_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.reading_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON public.reading_progress
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== USER_BOOKS ========================
DROP POLICY IF EXISTS "Users can view their own user_books" ON public.user_books;
DROP POLICY IF EXISTS "Users can insert their own user_books" ON public.user_books;
DROP POLICY IF EXISTS "Users can update their own user_books" ON public.user_books;
DROP POLICY IF EXISTS "Users can delete their own user_books" ON public.user_books;

CREATE POLICY "Users can view their own user_books" ON public.user_books
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user_books" ON public.user_books
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own user_books" ON public.user_books
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own user_books" ON public.user_books
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ======================== USER_ROLES ========================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ======================== VOTING_NOMINATIONS ========================
DROP POLICY IF EXISTS "Users can view nominations in their group" ON public.voting_nominations;
DROP POLICY IF EXISTS "Users can insert their own nomination" ON public.voting_nominations;
DROP POLICY IF EXISTS "Users can update their own nomination" ON public.voting_nominations;
DROP POLICY IF EXISTS "Users can delete their own nomination" ON public.voting_nominations;

CREATE POLICY "Users can view nominations in their group" ON public.voting_nominations
  FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can insert their own nomination" ON public.voting_nominations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can update their own nomination" ON public.voting_nominations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nomination" ON public.voting_nominations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
