import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi } from "lucide-react";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOfflineMessage) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <Alert className="border-destructive/50 text-destructive bg-destructive/10">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Você está offline. Algumas funcionalidades podem estar limitadas.
        </AlertDescription>
      </Alert>
    </div>
  );
};