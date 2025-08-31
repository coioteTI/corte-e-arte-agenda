import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { usePWA } from './hooks/usePWA'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { OfflineIndicator } from './components/OfflineIndicator'

const AppWithPWA = () => {
  usePWA(); // Initialize PWA functionality
  
  return (
    <>
      <App />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
};

createRoot(document.getElementById("root")!).render(<AppWithPWA />);
