
-- Create a groups table to store group metadata
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text UNIQUE NOT NULL,
  group_name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view groups
CREATE POLICY "Authenticated users can view groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create groups
CREATE POLICY "Admins can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update groups
CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete groups
CREATE POLICY "Admins can delete groups"
  ON public.groups FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Insert existing ZENHUB group
INSERT INTO public.groups (group_code, group_name, description, created_by)
VALUES ('ZENHUB', 'ZenHub Kitap Kulübü', 'Ana kitap kulübü', '43c1854f-99d3-4255-ab29-cb230002b318');

-- Add updated_at trigger
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
