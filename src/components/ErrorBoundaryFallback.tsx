import { FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    const err = error as Error | undefined;
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-6">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-serif font-bold mb-2">Oops! Bir hata oluştu</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
                Uygulama beklenmeyen bir durumla karşılaştı. Lütfen sayfayı yenilemeyi deneyin veya sorun devam ederse bizimle iletişime geçin.
            </p>

            {/* Dev mode error details (optional but helpful) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="bg-muted p-4 rounded-md overflow-auto w-full max-w-lg mb-6 text-left text-xs font-mono">
                    <p className="font-bold text-destructive mb-2">{err?.message}</p>
                    <pre className="text-muted-foreground whitespace-pre-wrap">{err?.stack}</pre>
                </div>
            )}

            <Button onClick={resetErrorBoundary} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Yeniden Dene
            </Button>
        </div>
    );
}
