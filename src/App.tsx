import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CookieConsent from "@/components/CookieConsent";
import { usePWA } from "@/hooks/usePWA";
import { useTheme } from "@/hooks/useTheme";
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

import Configuracoes from "./pages/dashboard/Configuracoes";
import WebhookLogs from "./pages/dashboard/WebhookLogs";
import Planos from "./pages/dashboard/Planos";
import HistoricoSimples from "./pages/dashboard/HistoricoSimples";
import BuscarBarbearias from "./pages/BuscarBarbearias";
import PerfilBarbearia from "./pages/PerfilBarbearia";
import AgendarServico from "./pages/AgendarServico";
import AgendamentoConfirmado from "./pages/AgendamentoConfirmado";
import Historico from "./pages/cliente/Historico";
import Agendamentos from "./pages/cliente/Agendamentos";
import Favoritos from "./pages/cliente/Favoritos";
import ConfiguracoesCliente from "./pages/cliente/Configuracoes";
import NotFound from "./pages/NotFound";
import EmailConfirmado from "./pages/EmailConfirmado";
import TesteEmail from "./pages/TesteEmail";
import PlanoPremium from "./pages/PlanoPremium";
import PaymentSuccess from "./pages/PaymentSuccess";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import PagamentoCancelado from "./pages/PagamentoCancelado";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const AppWithHooks = () => {
  // Initialize PWA and theme hooks
  usePWA();
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        
        {/* Rotas do Cliente */}
        <Route path="/buscar-barbearias" element={<BuscarBarbearias />} />
        <Route path="/barbearia/:slug" element={<PerfilBarbearia />} />
        <Route path="/agendar/:slug" element={<AgendarServico />} />
        <Route path="/agendamento-confirmado/:slug" element={<AgendamentoConfirmado />} />
        <Route path="/cliente/historico" element={<Historico />} />
        <Route path="/cliente/agendamentos" element={<Agendamentos />} />
        <Route path="/cliente/favoritos" element={<Favoritos />} />
        <Route path="/cliente/configuracoes" element={<ConfiguracoesCliente />} />
        
        {/* Rotas da Empresa */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/email-confirmado" element={<EmailConfirmado />} />
        <Route path="/teste-email" element={<TesteEmail />} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/plano-premium" element={<PlanoPremium />} />
        <Route path="/pagamento-sucesso" element={<PagamentoSucesso />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/pagamento-cancelado" element={<PagamentoCancelado />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
        <Route path="/dashboard/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/dashboard/servicos" element={<ProtectedRoute><Servicos /></ProtectedRoute>} />
        <Route path="/dashboard/profissionais" element={<ProtectedRoute><Profissionais /></ProtectedRoute>} />
        <Route path="/dashboard/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
        <Route path="/dashboard/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
        <Route path="/dashboard/horarios" element={<ProtectedRoute><Horarios /></ProtectedRoute>} />
        <Route path="/dashboard/planos" element={<ProtectedRoute><Planos /></ProtectedRoute>} />
        <Route path="/dashboard/webhook-logs" element={<ProtectedRoute><WebhookLogs /></ProtectedRoute>} />
        <Route path="/dashboard/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
        <Route path="/dashboard/historico" element={<ProtectedRoute><HistoricoSimples /></ProtectedRoute>} />
        
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <AppWithHooks />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
