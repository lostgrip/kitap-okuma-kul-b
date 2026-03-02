import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const getGroupCode = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc('get_user_group_code', { _user_id: user.id });
  return data || null;
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (bucket: string, file: File, folder?: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();

      // For book-files bucket, use group_code as the top-level folder
      let fileName: string;
      if (bucket === 'book-files') {
        const groupCode = await getGroupCode();
        if (!groupCode) {
          toast.error('Grup kodu bulunamadı');
          return null;
        }
        fileName = `${groupCode}/${crypto.randomUUID()}.${ext}`;
      } else {
        fileName = `${folder || 'uploads'}/${crypto.randomUUID()}.${ext}`;
      }

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error('Dosya yüklenemedi: ' + message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
