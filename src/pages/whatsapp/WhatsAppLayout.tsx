import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, MessageCircle, Users, CalendarDays, Briefcase, Settings, LogOut, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const menuItems = [
  { title: "Dashboard", url: "/whatsapp/dashboard", icon: LayoutDashboard },
  { title: "WhatsApp", url: "/whatsapp/chat", icon: MessageCircle },
  { title: "Contatos", url: "/whatsapp/contatos", icon: Users },
  { title: "Agenda", url: "/whatsapp/agenda", icon: CalendarDays },
  { title: "Serviços", url: "/whatsapp/servicos", icon: Briefcase },
  { title: "Configurações", url: "/whatsapp/configuracoes", icon: Settings },
];

const WhatsAppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/whatsapp/login");
      return;
    }
    const { data } = await supabase
      .from("whatsapp_tenants")
      .select("company_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setTenantName(data.company_name);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Até logo!" });
    navigate("/whatsapp/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">{tenantName || "WhatsApp CRM"}</h2>
                <p className="text-xs text-muted-foreground">Gestão WhatsApp</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <div className="mt-auto p-4">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 p-3 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <SidebarTrigger />
            <ThemeToggle />
          </div>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default WhatsAppLayout;
