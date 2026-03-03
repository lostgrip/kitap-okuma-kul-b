-- Adding feed_post_likes table for robust liking and post delete policies

CREATE TABLE IF NOT EXISTS public.feed_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes for posts in their group"
  ON public.feed_post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts fp
      WHERE fp.id = feed_post_likes.post_id
    )
  );

CREATE POLICY "Users can like posts"
  ON public.feed_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.feed_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Add delete policy for feed_posts if it doesn't exist
DROP POLICY IF EXISTS "Users can delete their own feed posts" ON public.feed_posts;
CREATE POLICY "Users can delete their own feed posts"
  ON public.feed_posts FOR DELETE
  USING (auth.uid() = user_id OR public.is_user_admin(auth.uid()));
