-- 1. Add WITH CHECK to profiles UPDATE policy so any direct attempt to flip is_admin is blocked at RLS layer
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Only allow is_admin changes if the user already holds the admin role
    is_admin = (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2. Create the trigger that was defined but never attached
--    The function prevent_is_admin_self_promotion() already exists.
DROP TRIGGER IF EXISTS lock_is_admin_on_profiles ON public.profiles;

CREATE TRIGGER lock_is_admin_on_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_admin_self_promotion();
