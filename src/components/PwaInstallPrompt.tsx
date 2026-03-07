import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

/**
 * PwaInstallPrompt
 * Shown once per session on mobile devices that support PWA install.
 * Dismisses permanently if the user taps "×".
 */
const PwaInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Don't show if they already dismissed
        if (localStorage.getItem('pwa-prompt-dismissed') === '1') return;
        // Don't show if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setVisible(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem('pwa-prompt-dismissed', '1');
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-elevated p-4 flex items-center gap-3">
                {/* App icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <img
                        src="/pwa-192x192.png"
                        alt="Zen Okuma"
                        className="w-9 h-9 rounded-lg object-cover"
                    />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Uygulamayı Yükle</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        Ana ekrana ekle, internet olmadan da okumaya devam et
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                        size="sm"
                        onClick={handleInstall}
                        className="h-8 px-3 text-xs rounded-xl"
                    >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Ekle
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismiss}
                        className="h-8 w-8 rounded-xl"
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PwaInstallPrompt;
