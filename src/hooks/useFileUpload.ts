import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const getGroupCode = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc('get_user_group_code', { _user_id: user.id });
  return data || null;
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const upload = async (bucket: string, file: File, folder?: string): Promise<string | null> => {
    // File size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimum ${MAX_FILE_SIZE_MB} MB yüklenebilir.`);
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const ext = file.name.split('.').pop();

      let fileName: string;
      if (bucket === 'book-files') {
        const groupCode = await getGroupCode();
        const prefix = groupCode || 'general';
        fileName = `${prefix}/${crypto.randomUUID()}.${ext}`;
      } else {
        fileName = `${folder || 'uploads'}/${crypto.randomUUID()}.${ext}`;
      }

      // Simulate progress for UX (Supabase JS SDK doesn't expose upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          // Slower progress for larger files
          const increment = file.size > 10 * 1024 * 1024 ? 2 : 5;
          return prev + increment;
        });
      }, 300);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      clearInterval(progressInterval);

      if (error) throw error;

      setUploadProgress(100);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Payload too large') || message.includes('413')) {
        toast.error(`Dosya çok büyük. Maksimum ${MAX_FILE_SIZE_MB} MB yüklenebilir.`);
      } else {
        toast.error('Dosya yüklenemedi: ' + message);
      }
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return { upload, isUploading, uploadProgress };
};
