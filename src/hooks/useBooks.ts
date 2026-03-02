import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
  genre: string | null;
  description: string | null;
  epub_url: string | null;
  added_by: string | null;
  club_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewBook {
  title: string;
  author: string;
  cover_url?: string | null;
  epub_url?: string | null;
  page_count: number;
  genre?: string | null;
  description?: string | null;
  added_by: string;
}

export const useBooks = () => {
  return useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
  });
};

export const useBook = (bookId: string) => {
  return useQuery({
    queryKey: ['books', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      return data as Book;
    },
    enabled: !!bookId,
  });
};

export const useAddBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBook: NewBook) => {
      const { data, error } = await supabase
        .from('books')
        .insert(newBook)
        .select()
        .single();

      if (error) throw error;
      return data as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useUpdateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Book> & { id: string }) => {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

// Club library hooks
export const useClubBooks = () => {
  return useQuery({
    queryKey: ['books', 'club', 'approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .in('club_status', ['approved', 'active_goal'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
  });
};

export const usePendingClubBooks = () => {
  return useQuery({
    queryKey: ['books', 'club', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('club_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
  });
};

export const useSubmitBookToClub = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .update({ club_status: 'pending' })
        .eq('id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useApproveClubBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .update({ club_status: 'approved' })
        .eq('id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useRejectClubBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .update({ club_status: null })
        .eq('id', bookId);

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useSetClubGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      // 1. Demote any current active_goal back to simply approved
      await supabase
        .from('books')
        .update({ club_status: 'approved' })
        .eq('club_status', 'active_goal');

      // 2. Set the newly selected book as the active_goal
      const { error } = await supabase
        .from('books')
        .update({ club_status: 'active_goal' })
        .eq('id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useRemoveClubGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      // Demote active_goal back to simply approved
      const { error } = await supabase
        .from('books')
        .update({ club_status: 'approved' })
        .eq('id', bookId)
        .eq('club_status', 'active_goal');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};
