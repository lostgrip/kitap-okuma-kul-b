
-- 1. Fix MISSING_RLS: Add INSERT policy for notifications
CREATE POLICY "Users can create notifications for themselves"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications for anyone"
  ON public.notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Fix DEFINER_OR_RPC_BYPASS: Add self-only checks to SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.get_user_group_code(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT group_code FROM public.profiles WHERE user_id = _user_id LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN FALSE;
  END IF;
  RETURN COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = _user_id LIMIT 1), false);
END;
$$;

-- 3. Fix invite_code_race: Create atomic increment function
CREATE OR REPLACE FUNCTION public.increment_invite_code_use(code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uses int;
  max_allowed int;
BEGIN
  SELECT uses_count, max_uses INTO current_uses, max_allowed
  FROM group_invite_codes
  WHERE id = code_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF max_allowed IS NOT NULL AND current_uses >= max_allowed THEN
    RETURN FALSE;
  END IF;

  UPDATE group_invite_codes
  SET uses_count = uses_count + 1
  WHERE id = code_id;

  RETURN TRUE;
END;
$$;

-- 4. Fix feedback_no_validation: Add DB constraints
ALTER TABLE public.feedback
ADD CONSTRAINT subject_length CHECK (length(subject) <= 200),
ADD CONSTRAINT message_length CHECK (length(message) <= 5000);

-- 5. Fix book_reviews_public: Scope reviews to group
DROP POLICY IF EXISTS "Anyone can view book reviews" ON public.book_reviews;

CREATE POLICY "Users can view reviews in their group"
  ON public.book_reviews FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = book_reviews.user_id
      AND (p.group_code IS NULL OR p.group_code = public.get_user_group_code(auth.uid()))
    )
  );
