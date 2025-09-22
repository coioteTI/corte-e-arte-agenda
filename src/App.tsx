import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CookieConsent from "@/components/CookieConsent";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cadastro from "./pages/Cadastro";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/dashboard/Agenda";
import Clientes from "./pages/dashboard/Clientes";
import Servicos from "./pages/dashboard/Servicos";
import Profissionais from "./pages/dashboard/Profissionais";
import Ranking from "./pages/dashboard/Ranking";
import Relatorios from "./pages/dashboard/Relatorios";
import Horarios from "./pages/dashboard/Horarios";
import Planos from "./pages/dashboard/Planos";
import WebhookLogs from "./pages/dashboard/WebhookLogs";
import HistoricoSimples from "./pages/dashboard/HistoricoSimples";
import Configuracoes from "./pages/dashboard/Configuracoes";
import Agendamentos from "./pages/cliente/Agendamentos";
import Historico from "./pages/cliente/Historico";
import Favoritos from "./pages/cliente/Favoritos";
import ConfiguracoesCliente from "./pages/cliente/Configuracoes";
import BuscarBarbearias from "./pages/BuscarBarbearias";
import PerfilBarbearia from "./pages/PerfilBarbearia";
import AgendarServico from "./pages/AgendarServico";
import AgendamentoConfirmado from "./pages/AgendamentoConfirmado";
import NotFound from "./pages/NotFound";
import PlanoPremium from "./pages/PlanoPremium";
import PaymentSuccess from "./pages/PaymentSuccess";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoCancelado from "./pages/PagamentoCancelado";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  // PWA logic inline
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWA setup
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      setIsInstalled(isStandalone || isFullscreen || isMinimalUi);
    };

    checkIfInstalled();

    // Listen for app install
    const handleAppInstalled = () => {
      setIsInstalled(true);
    };

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
    const minimalUiQuery = window.matchMedia('(display-mode: minimal-ui)');
    
    const handleDisplayModeChange = () => {
      checkIfInstalled();
    };
    
    standaloneQuery.addEventListener('change', handleDisplayModeChange);
    fullscreenQuery.addEventListener('change', handleDisplayModeChange);
    minimalUiQuery.addEventListener('change', handleDisplayModeChange);
    
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
      fullscreenQuery.removeEventListener('change', handleDisplayModeChange);
      minimalUiQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/buscar-barbearias" element={<BuscarBarbearias />} />
            <Route path="/perfil-barbearia/:id" element={<PerfilBarbearia />} />
            <Route path="/agendar-servico/:id" element={<AgendarServico />} />
            <Route path="/agendamento-confirmado/:id" element={<AgendamentoConfirmado />} />
            <Route path="/planos" element={<PlanoPremium />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/pagamento-sucesso" element={<PagamentoSucesso />} />
            <Route path="/pagamento-cancelado" element={<PagamentoCancelado />} />
            
            {/* Dashboard Routes - Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/agenda" element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/clientes" element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/servicos" element={
              <ProtectedRoute>
                <Servicos />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/profissionais" element={
              <ProtectedRoute>
                <Profissionais />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/ranking" element={
              <ProtectedRoute>
                <Ranking />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/relatorios" element={
              <ProtectedRoute>
                <Relatorios />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/horarios" element={
              <ProtectedRoute>
                <Horarios />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/planos" element={
              <ProtectedRoute>
                <Planos />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/webhook-logs" element={
              <ProtectedRoute>
                <WebhookLogs />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/historico" element={
              <ProtectedRoute>
                <HistoricoSimples />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/configuracoes" element={
              <ProtectedRoute>
                <Configuracoes />
              </ProtectedRoute>
            } />
            
            {/* Client Routes - Protected */}
            <Route path="/cliente/agendamentos" element={
              <ProtectedRoute>
                <Agendamentos />
              </ProtectedRoute>
            } />
            <Route path="/cliente/historico" element={
              <ProtectedRoute>
                <Historico />
              </ProtectedRoute>
            } />
            <Route path="/cliente/favoritos" element={
              <ProtectedRoute>
                <Favoritos />
              </ProtectedRoute>
            } />
            <Route path="/cliente/configuracoes" element={
              <ProtectedRoute>
                <ConfiguracoesCliente />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* PWA Components */}
          {!isInstalled && <PWAInstallPrompt />}
          <OfflineIndicator />
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;