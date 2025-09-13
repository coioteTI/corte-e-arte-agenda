import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { usePWA } from "./hooks/usePWA";
import { useTheme } from "./hooks/useTheme";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";

const AppWithPWA = () => {
  usePWA();
  useTheme();

  return (
    <>
      <App />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Elemento #root não encontrado no index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppWithPWA />
  </StrictMode>
);
