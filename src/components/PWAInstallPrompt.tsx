import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

// Storage key for dismissal
const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_DAYS = 7;

// Check if dismissed recently (outside component to avoid re-renders)
const checkIfDismissedRecently = (): boolean => {
  try {
    const dismissedTime = localStorage.getItem(DISMISS_KEY);
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      return daysSinceDismissed < DISMISS_DURATION_DAYS;
    }
  } catch (e) {
    // localStorage might not be available
  }
  return false;
};

// Check if already installed (outside component)
const checkIfInstalled = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  try {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    return isStandalone || isIOSStandalone;
  } catch (e) {
    return true; // Assume installed if we can't check
  }
};

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // Start as true to prevent flash
  const [isDismissed, setIsDismissed] = useState(true); // Start as true to prevent flash

  useEffect(() => {
    // Early exit conditions - check synchronously first
    if (checkIfInstalled()) {
      setIsInstalled(true);
      return;
    }
    
    if (checkIfDismissedRecently()) {
      setIsDismissed(true);
      return;
    }

    // Not installed and not dismissed
    setIsInstalled(false);
    setIsDismissed(false);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('Install prompt outcome:', outcome);
      } catch (e) {
        console.error('Install prompt error:', e);
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch (e) {
      // localStorage might not be available
    }
  }, []);

  // Don't render if any condition is true
  if (isInstalled || isDismissed || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <Card className="border-primary/20 bg-background/95 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                Instalar Corte & Arte
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Instale nosso app para acesso rápido e experiência offline
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="h-8 px-3 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Instalar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="h-8 px-2"
                  aria-label="Fechar"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
