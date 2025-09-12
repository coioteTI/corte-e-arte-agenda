import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { usePWA } from './hooks/usePWA'
import { useTheme } from './hooks/useTheme'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { OfflineIndicator } from './components/OfflineIndicator'

const AppWithPWA: React.FC = () => {
  usePWA(); // Initialize PWA functionality
  useTheme(); // Initialize theme functionality
  
  return (
    <>
      <App />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
};

createRoot(document.getElementById("root")!).render(<AppWithPWA />);
