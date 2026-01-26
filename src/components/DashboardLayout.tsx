import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Calendar, Users, Settings, FileText, Clock, BarChart, Crown, Trophy, UserCheck, History, Package, Wallet, Loader2, Lock, Shield, User, UsersRound } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatusBanner } from "./SubscriptionStatusBanner";
import { SubscriptionBlocker } from "./SubscriptionBlocker";
import { ThemeToggle } from "./ThemeToggle";
import { BranchSelector } from "./BranchSelector";
import { NotificationBell } from "./NotificationBell";
import { useModuleSettingsContext, DEFAULT_MODULES } from "@/contexts/ModuleSettingsContext";
import { useBranch } from "@/contexts/BranchContext";
import { AppRole } from "@/hooks/useUserRole";

// Icon mapping for modules
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  agenda: Calendar,
  clientes: Users,
  servicos: FileText,
  profissionais: UserCheck,
  funcionarios: UsersRound,
  estoque: Package,
  historico: History,
  salarios: Wallet,
  ranking: Trophy,
  relatorios: BarChart,
  horarios: Clock,
  planos: Crown,
};

// Role labels and styling
const roleLabels: Record<AppRole, { label: string; icon: React.ComponentType<any>; color: string }> = {
  employee: { label: "Funcionário", icon: User, color: "bg-blue-500" },
  admin: { label: "Administrador", icon: Shield, color: "bg-orange-500" },
  ceo: { label: "CEO", icon: Crown, color: "bg-purple-500" },
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
  const { userRole, hasModuleAccess, currentBranch } = useBranch();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
  };

  // Build dynamic menu items based on enabled modules AND user role permissions
  const dynamicMenuItems = DEFAULT_MODULES
    .filter(module => {
      const isEnabled = isModuleEnabled(module.key);
      const hasAccess = hasModuleAccess(module.key);
      return isEnabled && hasAccess;
    })
    .map(module => ({
      title: module.name,
      url: module.url,
      icon: iconMap[module.key] || FileText,
      key: module.key,
    }));

  // Filter static items by role
  const filteredStaticItems = staticMenuItems.filter(item => hasModuleAccess(item.key));

  const allMenuItems = [...dynamicMenuItems, ...filteredStaticItems];

  const RoleIcon = userRole ? roleLabels[userRole].icon : User;

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <img 
            src={companyLogo || logo} 
            alt={companyName || "Dashboard"} 
            className="h-8 w-auto"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{companyName || "Dashboard"}</h2>
            {currentBranch && (
              <p className="text-xs text-muted-foreground truncate">{currentBranch.name}</p>
            )}
          </div>
        </div>
        {userRole && (
          <div className="mt-3">
            <Badge className={`${roleLabels[userRole].color} text-white flex items-center gap-1 w-fit`}>
              <RoleIcon className="h-3 w-3" />
              {roleLabels[userRole].label}
            </Badge>
          </div>
        )}
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
          
          {/* Show locked modules for awareness */}
          {userRole && userRole !== 'ceo' && (
            <>
              {DEFAULT_MODULES
                .filter(module => isModuleEnabled(module.key) && !hasModuleAccess(module.key))
                .map(module => {
                  const Icon = iconMap[module.key] || FileText;
                  return (
                    <SidebarMenuItem key={module.key}>
                      <SidebarMenuButton disabled className="opacity-50 cursor-not-allowed">
                        <Icon className="h-4 w-4" />
                        <span>{module.name}</span>
                        <Lock className="h-3 w-3 ml-auto" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </>
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
  const { currentBranch, userRole, companyId } = useBranch();

  useEffect(() => {
    loadCompanyInfo();
  }, [companyId]);

  const loadCompanyInfo = async () => {
    try {
      if (!companyId) return;
      
      const { data: company } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', companyId)
        .maybeSingle();
      
      if (company?.name) {
        setCompanyName(company.name);
      }
      if (company?.logo_url) {
        setCompanyLogo(company.logo_url);
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
                <BranchSelector />
                <NotificationBell />
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
