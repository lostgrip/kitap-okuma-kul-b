import { useState } from 'react';
import { Quote, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDailyQuote, useCreateQuote } from '@/hooks/useDailyQuotes';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const QuoteOfTheDay = () => {
  const { user, profile } = useAuth();
  const { data: quote, isLoading } = useDailyQuote();
  const createQuote = useCreateQuote();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQuote, setNewQuote] = useState({ text: '', author: '' });

  const handleSubmitQuote = async () => {
    if (!newQuote.text.trim() || !user || !profile?.group_code) {
      toast.error('Alıntı metni girin');
      return;
    }

    try {
      await createQuote.mutateAsync({
        user_id: user.id,
        group_code: profile.group_code,
        quote_text: newQuote.text,
        author: newQuote.author || null,
        book_id: null,
        featured_date: null,
      });
      setNewQuote({ text: '', author: '' });
      setIsDialogOpen(false);
      toast.success('Alıntı gönderildi!');
    } catch (error) {
      toast.error('Alıntı gönderilirken hata oluştu');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-5 shadow-card border border-border/40">
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-primary/15">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Quote className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-serif font-semibold text-sm">Günün Sözü</h3>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs">
              <Send className="w-3.5 h-3.5" />
              Öner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif">Alıntı Öner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="quoteText">Alıntı</Label>
                <Textarea
                  id="quoteText"
                  value={newQuote.text}
                  onChange={(e) => setNewQuote({ ...newQuote, text: e.target.value })}
                  placeholder="Kitaptan veya yazardan bir alıntı..."
                  className="mt-1.5 resize-none"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="quoteAuthor">Yazar / Kaynak</Label>
                <Input
                  id="quoteAuthor"
                  value={newQuote.author}
                  onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
                  placeholder="Örn: Orhan Pamuk"
                  className="mt-1.5"
                />
              </div>
              <Button 
                onClick={handleSubmitQuote} 
                className="w-full"
                disabled={createQuote.isPending}
              >
                {createQuote.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Gönder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {quote ? (
        <div>
          <blockquote className="text-foreground/85 italic leading-relaxed text-[15px]">
            "{quote.quote_text}"
          </blockquote>
          {quote.author && (
            <p className="text-xs text-muted-foreground mt-2.5 font-medium">
              — {quote.author}
            </p>
          )}
        </div>
      ) : (
        <div>
          <blockquote className="text-foreground/85 italic leading-relaxed text-[15px]">
            "İnsan, ancak aradığı zaman bulur; ancak dayanamadığı zaman düşünür."
          </blockquote>
          <p className="text-xs text-muted-foreground mt-2.5 font-medium">
            — Sabahattin Ali
          </p>
        </div>
      )}
    </div>
  );
};

export default QuoteOfTheDay;
