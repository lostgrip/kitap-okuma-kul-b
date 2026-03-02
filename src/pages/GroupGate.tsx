import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GroupGate = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [groupCode, setGroupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      toast.error('Lütfen bir grup kodu girin');
      return;
    }

    if (!user) {
      toast.error('Giriş yapmalısınız');
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      // Check if group code exists (any user with this code)
      const { data: existingGroup, error: checkError } = await supabase
        .from('profiles')
        .select('group_code')
        .eq('group_code', groupCode.toUpperCase().trim())
        .limit(1)
        .maybeSingle();

      if (checkError) throw checkError;

      // For now, any code is valid (admins create codes manually)
      // In production, you'd validate against a groups table
      
      // Update user's profile with the group code
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ group_code: groupCode.toUpperCase().trim() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Gruba başarıyla katıldınız!');
      
      // Reload to update profile context
      window.location.href = '/';
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Gruba katılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // If user already has a group code, redirect to home
  if (profile?.group_code) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-md mb-8">
        <BookOpen className="w-10 h-10 text-primary-foreground" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-serif font-bold text-center mb-2">
        Kitap Kulübü
      </h1>
      <p className="text-muted-foreground text-center mb-8 max-w-xs">
        Okuma topluluğunuza katılın ve birlikte kitap keşfedin
      </p>

      {/* Group Code Input */}
      <div className="w-full max-w-sm space-y-6">
        <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Gruba Katıl</h2>
              <p className="text-xs text-muted-foreground">Davet kodunuzu girin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="groupCode" className="text-sm font-medium">
                Grup Kodu
              </Label>
              <Input
                id="groupCode"
                placeholder="ABCD1234"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                className="mt-1.5 h-12 text-center text-lg font-mono uppercase tracking-widest"
                maxLength={10}
              />
            </div>

            <Button 
              onClick={handleJoinGroup} 
              className="w-full h-12 gap-2"
              disabled={isLoading || !groupCode.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Gruba Katıl
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          Grup kodunu almak için kulüp yöneticinize başvurun. 
          Henüz hesabınız yoksa önce{' '}
          <button 
            onClick={() => navigate('/auth')}
            className="text-primary underline"
          >
            kayıt olun
          </button>.
        </p>
      </div>
    </div>
  );
};

export default GroupGate;
