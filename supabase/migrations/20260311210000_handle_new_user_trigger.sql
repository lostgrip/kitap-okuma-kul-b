-- Auto-create a profile row whenever a new auth.users row is inserted.
-- This runs as SECURITY DEFINER (superuser context) so RLS is bypassed,
-- which is the correct and safe pattern for server-side user provisioning.

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
  ON CONFLICT (user_id) DO NOTHING;  -- idempotent: skip if profile already exists
  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users (drops first if it already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
