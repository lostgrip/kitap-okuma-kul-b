import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Group {
  id: string;
  group_code: string;
  group_name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Group[];
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ groupCode, groupName, description }: { groupCode: string; groupName: string; description?: string }) => {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          group_code: groupCode.toUpperCase().replace(/\s+/g, ''),
          group_name: groupName,
          description: description || null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};
