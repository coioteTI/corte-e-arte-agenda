import { useState, useEffect } from "react";
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
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Calendar, Users, Settings, FileText, Clock, BarChart, Crown, Trophy, UserCheck, History, Package, Wallet, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatusBanner } from "./SubscriptionStatusBanner";
import { SubscriptionBlocker } from "./SubscriptionBlocker";
import { ThemeToggle } from "./ThemeToggle";
import { useModuleSettingsContext, DEFAULT_MODULES } from "@/contexts/ModuleSettingsContext";

// Icon mapping for modules
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  agenda: Calendar,
  clientes: Users,
  servicos: FileText,
  profissionais: UserCheck,
  estoque: Package,
  historico: History,
  salarios: Wallet,
  ranking: Trophy,
  relatorios: BarChart,
  horarios: Clock,
  planos: Crown,
};

// Static menu items (always visible)
const staticMenuItems = [
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings, key: "configuracoes" },
];

interface AppSidebarProps {
  companyName: string;
  companyLogo?: string;
}

const AppSidebar = ({ companyName, companyLogo }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { modules, loading, isModuleEnabled } = useModuleSettingsContext();

  const handleLogout = () => {
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
  };

  // Build dynamic menu items based on enabled modules
  const dynamicMenuItems = DEFAULT_MODULES
    .filter(module => isModuleEnabled(module.key))
    .map(module => ({
      title: module.name,
      url: module.url,
      icon: iconMap[module.key] || FileText,
      key: module.key,
    }));

  const allMenuItems = [...dynamicMenuItems, ...staticMenuItems];

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <img 
            src={companyLogo || logo} 
            alt={companyName || "Dashboard"} 
            className="h-8 w-auto"
          />
          <div>
            <h2 className="text-lg font-semibold">{companyName || "Dashboard"}</h2>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            allMenuItems.map((item) => (
              <SidebarMenuItem key={item.key}>
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
            ))
          )}
        </SidebarMenu>
        
        <div className="mt-auto p-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLogout}
          >
            Sair
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [companyName, setCompanyName] = useState<string>("");
  const [companyLogo, setCompanyLogo] = useState<string>("");
  const { setCompanyId } = useModuleSettingsContext();

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('user_id', user.id)
          .single();
        
        if (companies?.id) {
          setCompanyId(companies.id);
        }
        if (companies?.name) {
          setCompanyName(companies.name);
        }
        if (companies?.logo_url) {
          setCompanyLogo(companies.logo_url);
        }
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };
  
  return (
    <SubscriptionBlocker>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar companyName={companyName} companyLogo={companyLogo} />
          <main className="flex-1 p-3 md:p-6">
            <div className="mb-4 md:mb-6 flex items-center justify-between">
              <SidebarTrigger />
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  Bem-vindo, {companyName || 'Administrador'}
                </div>
                <ThemeToggle />
              </div>
            </div>
            <SubscriptionStatusBanner />
            {children}
          </main>
        </div>
      </SidebarProvider>
    </SubscriptionBlocker>
  );
};

export default DashboardLayout;
