
-- 1. Prevent users from changing their own group_code via profile update
CREATE OR REPLACE FUNCTION public.prevent_group_code_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow group_code change if user currently has no group (joining for first time)
  -- or if the user is an admin
  IF OLD.group_code IS NOT NULL AND NEW.group_code IS DISTINCT FROM OLD.group_code THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      NEW.group_code := OLD.group_code; -- silently revert
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_group_code_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_group_code_change();

-- 2. Restrict groups SELECT to user's own group only
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
CREATE POLICY "Users can view their own group"
  ON public.groups FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
