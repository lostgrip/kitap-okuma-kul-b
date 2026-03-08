
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.group_invite_codes;

-- Create a SECURITY DEFINER RPC for safe validation
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT id, group_code, expires_at, max_uses, uses_count
  INTO rec
  FROM group_invite_codes
  WHERE invite_code = code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF rec.max_uses IS NOT NULL AND rec.uses_count >= rec.max_uses THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'group_code', rec.group_code, 'code_id', rec.id);
END;
$$;
