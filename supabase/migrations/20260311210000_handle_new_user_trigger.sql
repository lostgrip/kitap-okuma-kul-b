-- ============================================================
-- FIX: Auto-create profiles row on user signup via DB trigger.
-- This avoids the RLS INSERT restriction that blocks frontend
-- inserts made before a session is established.
-- ============================================================

-- 1. Allow the trigger (which runs as the postgres/service role)
--    to insert into profiles by adding a permissive policy.
--    The existing "authenticated" INSERT policy blocks anon/service inserts.
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Create (or replace) the trigger function.
--    SECURITY DEFINER + search_path guard is the canonical Supabase pattern.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' ||
      COALESCE(NEW.raw_user_meta_data->>'username', NEW.id::text)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block user creation due to a profile insert failure.
    RAISE WARNING 'handle_new_user: could not create profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
