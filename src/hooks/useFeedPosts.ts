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

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: unknown) => Promise<{ error: unknown }>, delete: () => { eq: (field: string, val: unknown) => { eq: (field: string, val: unknown) => Promise<{ error: unknown }> } } } })
        .from('feed_post_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
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
