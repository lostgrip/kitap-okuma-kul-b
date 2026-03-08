
CREATE TABLE public.voting_nominations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_title text NOT NULL,
  book_author text NOT NULL,
  book_cover_url text,
  group_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.voting_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nominations in their group"
  ON public.voting_nominations FOR SELECT
  TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can insert their own nomination"
  ON public.voting_nominations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND group_code = get_user_group_code(auth.uid()));

CREATE POLICY "Users can delete their own nomination"
  ON public.voting_nominations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own nomination"
  ON public.voting_nominations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
