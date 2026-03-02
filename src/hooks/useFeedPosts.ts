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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FeedPost[];
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
