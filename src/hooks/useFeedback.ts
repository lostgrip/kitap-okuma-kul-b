import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeedbackInput {
  user_id?: string;
  email?: string;
  feedback_type: 'suggestion' | 'complaint' | 'question' | 'other';
  subject: string;
  message: string;
}

export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: async (feedback: FeedbackInput) => {
      const { data, error } = await supabase
        .from('feedback')
        .insert(feedback)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
};
