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
    // Books rarely change mid-session — keep cached for 10 min
    staleTime: 10 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
    // Optimistic update: show book immediately in list
    onMutate: async (newBook) => {
      await queryClient.cancelQueries({ queryKey: ['books'] });
      const previous = queryClient.getQueryData<Book[]>(['books']);
      const optimistic: Book = {
        ...newBook,
        id: `temp-${Date.now()}`,
        club_status: null,
        cover_url: newBook.cover_url ?? null,
        epub_url: newBook.epub_url ?? null,
        genre: newBook.genre ?? null,
        description: newBook.description ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Book[]>(['books'], (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // Rollback on failure
      if (ctx?.previous) queryClient.setQueryData(['books'], ctx.previous);
    },
    onSettled: () => {
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
    staleTime: 10 * 60 * 1000,
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

export const useAddClubBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBook: NewBook) => {
      const { data, error } = await supabase
        .from('books')
        .insert({ ...newBook, club_status: 'approved' })
        .select()
        .single();

      if (error) throw error;
      return data as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'club'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};
