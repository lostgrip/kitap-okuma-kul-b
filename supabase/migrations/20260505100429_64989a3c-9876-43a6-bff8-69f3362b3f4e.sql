
-- 1. Remove legacy COALESCE-based storage policies that grant access via 'general' fallback
DROP POLICY IF EXISTS "Authenticated users can read their group book-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload group book-files" ON storage.objects;

-- 2. Drop legacy permissive book_votes policy if it still exists
DROP POLICY IF EXISTS "Users can view all votes" ON public.book_votes;

-- 3. Harden profile updates: prevent users from changing is_admin via client.
-- The DB trigger prevent_is_admin_self_promotion already reverts changes, but tighten the
-- WITH CHECK to forbid is_admin mutation entirely unless the caller is admin via user_roles.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  AND (
    group_code IS NOT DISTINCT FROM (SELECT p.group_code FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    OR (SELECT p.group_code FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1) IS NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
