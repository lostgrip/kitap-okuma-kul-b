import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InviteCode {
  id: string;
  group_code: string;
  invite_code: string;
  created_by: string | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export const useInviteCodes = () => {
  return useQuery({
    queryKey: ['invite_codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InviteCode[];
    },
  });
};

export const useValidateInviteCode = () => {
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data, error } = await supabase.rpc('validate_invite_code', {
        code: inviteCode,
      }) as { data: { valid: boolean; group_code: string; code_id: string } | null; error: any };

      if (error) throw error;

      if (!data || !data.valid) {
        throw new Error('Geçersiz davet kodu');
      }

      return data as { valid: boolean; group_code: string; code_id: string };
    },
  });
};

export const useCreateInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      groupCode, 
      createdBy,
      expiresAt, 
      maxUses 
    }: { 
      groupCode: string; 
      createdBy: string;
      expiresAt?: string | null; 
      maxUses?: number | null;
    }) => {
      const { data, error } = await supabase
        .from('group_invite_codes')
        .insert({
          group_code: groupCode,
          created_by: createdBy,
          expires_at: expiresAt || null,
          max_uses: maxUses || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InviteCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite_codes'] });
    },
  });
};

export const useDeactivateInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from('group_invite_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite_codes'] });
    },
  });
};

export const useIncrementInviteCodeUse = () => {
  return useMutation({
    mutationFn: async (codeId: string) => {
      const { data, error } = await supabase.rpc('increment_invite_code_use', {
        code_id: codeId,
      });

      if (error) throw error;
      if (!data) throw new Error('Davet kodu kullanım limitine ulaşmış');
    },
  });
};
