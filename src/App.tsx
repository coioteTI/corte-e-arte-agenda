import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cadastro from "./pages/Cadastro";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/dashboard/Agenda";
import Clientes from "./pages/dashboard/Clientes";
import Servicos from "./pages/dashboard/Servicos";
import Relatorios from "./pages/dashboard/Relatorios";
import Horarios from "./pages/dashboard/Horarios";
import Configuracoes from "./pages/dashboard/Configuracoes";
import BuscarBarbearias from "./pages/BuscarBarbearias";
import PerfilBarbearia from "./pages/PerfilBarbearia";
import AgendarServico from "./pages/AgendarServico";
import AgendamentoConfirmado from "./pages/AgendamentoConfirmado";
import Historico from "./pages/cliente/Historico";
import Agendamentos from "./pages/cliente/Agendamentos";
import Favoritos from "./pages/cliente/Favoritos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WhatsAppWidget />
      <CookieConsent />
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
          
          {/* Rotas da Empresa */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/agenda" element={<Agenda />} />
          <Route path="/dashboard/clientes" element={<Clientes />} />
          <Route path="/dashboard/servicos" element={<Servicos />} />
          <Route path="/dashboard/relatorios" element={<Relatorios />} />
          <Route path="/dashboard/horarios" element={<Horarios />} />
          <Route path="/dashboard/configuracoes" element={<Configuracoes />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
