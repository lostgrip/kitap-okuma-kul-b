-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable Row-Level Security on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add group_invite_codes table for generating invite links
CREATE TABLE public.group_invite_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code text NOT NULL,
    invite_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at timestamp with time zone,
    max_uses integer,
    uses_count integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on group_invite_codes
ALTER TABLE public.group_invite_codes ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage invite codes for their group
CREATE POLICY "Admins can view their group invite codes"
ON public.group_invite_codes
FOR SELECT
TO authenticated
USING (
  group_code = get_user_group_code(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can create invite codes"
ON public.group_invite_codes
FOR INSERT
TO authenticated
WITH CHECK (
  group_code = get_user_group_code(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin')
  AND auth.uid() = created_by
);

CREATE POLICY "Admins can update invite codes"
ON public.group_invite_codes
FOR UPDATE
TO authenticated
USING (
  group_code = get_user_group_code(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete invite codes"
ON public.group_invite_codes
FOR DELETE
TO authenticated
USING (
  group_code = get_user_group_code(auth.uid()) 
  AND public.has_role(auth.uid(), 'admin')
);

-- Public can validate invite codes (for joining)
CREATE POLICY "Anyone can validate invite codes"
ON public.group_invite_codes
FOR SELECT
USING (is_active = true);

-- Update book_lists RLS to allow admins to approve community lists
DROP POLICY IF EXISTS "Users can update their own lists" ON public.book_lists;

CREATE POLICY "Users can update their own lists or admins can approve"
ON public.book_lists
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR (
    public.has_role(auth.uid(), 'admin') 
    AND group_code = get_user_group_code(auth.uid())
  )
);