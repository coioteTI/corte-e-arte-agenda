import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Calendar, Heart, History, User, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { title: "Meus Agendamentos", url: "/cliente/agendamentos", icon: Calendar },
  { title: "Histórico", url: "/cliente/historico", icon: History },
  { title: "Favoritos", url: "/cliente/favoritos", icon: Heart },
];

const ClientSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get client name from localStorage
  const clientName = localStorage.getItem('clientName') || 'Cliente';

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-8 w-auto"
          />
          <div>
            <h2 className="text-lg font-semibold">Corte & Arte</h2>
            <p className="text-xs text-muted-foreground">Cliente</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild
                isActive={location.pathname === item.url}
              >
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        <div className="mt-auto p-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const clientName = localStorage.getItem('clientName') || 'Cliente';
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar />
        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <SidebarTrigger />
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Bem-vindo, {clientName}
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ClientLayout;