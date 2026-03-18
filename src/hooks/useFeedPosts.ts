import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeedPost {
  id: string;
  user_id: string;
  book_id: string | null;
  content: string;
  post_type: 'update' | 'review' | 'quote' | 'milestone' | 'poll' | 'recommendation';
  image_url: string | null;
  created_at: string;
  updated_at: string;
  feed_post_likes?: { user_id: string }[] | null | unknown;
}

export interface NewFeedPost {
  user_id: string;
  book_id?: string | null;
  content: string;
  post_type?: 'update' | 'review' | 'quote' | 'milestone' | 'poll' | 'recommendation';
  image_url?: string;
}

export interface PollVote {
  id: string;
  post_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export const useFeedPosts = () => {
  return useQuery({
    queryKey: ['feed_posts'],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_posts')
        .select(`
          *,
          feed_post_likes ( user_id )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback if the relation doesn't exist yet on the remote database
        if (error.code === 'PGRST200') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('feed_posts')
            .select('*')
            .order('created_at', { ascending: false });
          if (fallbackError) throw fallbackError;
          return fallbackData as FeedPost[];
        }
        throw error;
      }
      return data as unknown as FeedPost[];
    },
  });
};

export const useAddFeedPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPost: NewFeedPost) => {
      const { data, error } = await supabase
        .from('feed_posts')
        .insert({
          user_id: newPost.user_id,
          book_id: newPost.book_id,
          content: newPost.content,
          post_type: newPost.post_type || 'update',
          image_url: newPost.image_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FeedPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
    },
  });
};

export const useDeleteFeedPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('feed_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
    },
  });
};

// ─── Poll votes ──────────────────────────────────────────────────────────────

export const usePollVotes = (postId: string) => {
  return useQuery({
    queryKey: ['poll_votes', postId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('feed_poll_votes')
        .select('*')
        .eq('post_id', postId);
      if (error) {
        // Table may not exist on older deployments — return empty gracefully
        if (error.code === '42P01') return [] as PollVote[];
        throw error;
      }
      return (data ?? []) as PollVote[];
    },
    enabled: !!postId,
    staleTime: 60 * 1000,
  });
};

export const useVotePoll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, userId, optionIndex }: { postId: string; userId: string; optionIndex: number }) => {
      // Check existing vote
      const { data: existing } = await (supabase as any)
        .from('feed_poll_votes')
        .select('id, option_index')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.option_index === optionIndex) {
          // Remove vote (toggle off)
          const { error } = await (supabase as any)
            .from('feed_poll_votes')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
          return null;
        } else {
          // Change vote
          const { error } = await (supabase as any)
            .from('feed_poll_votes')
            .update({ option_index: optionIndex })
            .eq('id', existing.id);
          if (error) throw error;
          return optionIndex;
        }
      } else {
        const { error } = await (supabase as any)
          .from('feed_poll_votes')
          .insert({ post_id: postId, user_id: userId, option_index: optionIndex });
        if (error) throw error;
        return optionIndex;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['poll_votes', vars.postId] });
    },
  });
};

// ─── Likes with notification ──────────────────────────────────────────────────

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId, postOwnerId }: { postId: string; userId: string; postOwnerId: string }) => {
      const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<{ error: unknown }> } })
        .from('feed_post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) throw error;

      // Send notification to post owner (not to self)
      if (postOwnerId && postOwnerId !== userId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          type: 'like',
          title: 'Gönderinizi beğendi',
          message: 'Birisi gönderinizi beğendi.',
          data: { post_id: postId },
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useUnlikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<{ error: unknown }>, delete: () => { eq: (field: string, val: unknown) => { eq: (field: string, val: unknown) => Promise<{ error: unknown }> } } } })
        .from('feed_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
    },
  });
};
