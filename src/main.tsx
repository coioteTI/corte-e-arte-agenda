import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { usePWA } from "./hooks/usePWA";
import { useTheme } from "./hooks/useTheme";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";

// Wrapper para evitar quebra silenciosa
const AppWithPWA: React.FC = () => {
  try {
    usePWA();   // Inicializa PWA
    useTheme(); // Inicializa tema
  } catch (err) {
    console.error("Erro nos hooks iniciais:", err);
  }

  return (
    <>
      <App />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
};

// Garante que o elemento root existe
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Elemento #root não encontrado no index.html");
}

// Renderização com StrictMode para capturar warnings/erros
createRoot(rootElement).render(
  <StrictMode>
    <AppWithPWA />
  </StrictMode>
);
