-- Feed Post Poll Votes
-- Kullanıcıların anket gönderilerine oy vermesi için

CREATE TABLE IF NOT EXISTS public.feed_poll_votes (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id      UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INT  NOT NULL CHECK (option_index >= 0 AND option_index <= 9),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)   -- her kullanıcı bir ankette yalnızca 1 oy kullanabilir
);

ALTER TABLE public.feed_poll_votes ENABLE ROW LEVEL SECURITY;

-- Herkes kendi grubundaki oyları görebilir (feed_posts group_code'a göre zaten filtreli geliyor)
CREATE POLICY "Users can view poll votes"
  ON public.feed_poll_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts fp
      JOIN public.profiles p ON p.user_id = fp.user_id
      WHERE fp.id = feed_poll_votes.post_id
        AND p.group_code = get_user_group_code(auth.uid())
    )
  );

-- Kullanıcı kendi oyunu ekleyebilir
CREATE POLICY "Users can insert their own poll vote"
  ON public.feed_poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcı kendi oyunu silebilir (oy değiştirmek için)
CREATE POLICY "Users can delete their own poll vote"
  ON public.feed_poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
