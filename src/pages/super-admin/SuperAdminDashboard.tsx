import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { GlobalReportsTab } from '@/components/super-admin/GlobalReportsTab';
import UnifiedSupportTab from '@/components/super-admin/UnifiedSupportTab';
import BranchManagementTab from '@/components/super-admin/BranchManagementTab';
import CompanyManagementTab from '@/components/super-admin/CompanyManagementTab';
import UserAccessManagementTab from '@/components/super-admin/UserAccessManagementTab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, LogOut, Building2, Users, Calendar, GitBranch, 
  Loader2, RefreshCw, Lock, Unlock, Eye, TrendingUp,
  Clock, AlertTriangle, CheckCircle, Crown, Ban, Settings,
   ChevronRight, Search, Filter, MessageSquare, BarChart3, Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  total_companies: number;
  total_branches: number;
  total_appointments: number;
  total_users: number;
  premium_companies: number;
  trial_companies: number;
  blocked_companies: number;
  expiring_companies: number;
  monthly_appointments: number;
  monthly_stock_sales: number;
  branch_creation_enabled_count: number;
}

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  subscription_status: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_appointments_used: number;
  trial_appointments_limit: number;
  branch_limit: number;
  branch_count: number;
  appointments_count: number;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  can_create_branches: boolean;
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}

const SuperAdminDashboard = () => {
  const { session, isAuthenticated, logout } = useSuperAdmin();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialogs
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showBranchLimitDialog, setShowBranchLimitDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  
  // Form states
  const [newBranchLimit, setNewBranchLimit] = useState<number>(5);
  const [blockReason, setBlockReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [newPlanEndDate, setNewPlanEndDate] = useState('');
  const [newTrialLimit, setNewTrialLimit] = useState(50);
  const [resetTrial, setResetTrial] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/super-admin/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let filtered = companies;
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (planFilter !== 'all') {
      filtered = filtered.filter(c => c.plan === planFilter);
    }
    
    if (statusFilter === 'blocked') {
      filtered = filtered.filter(c => c.is_blocked);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(c => !c.is_blocked && c.subscription_status === 'active');
    } else if (statusFilter === 'expiring') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      filtered = filtered.filter(c => 
        c.subscription_end_date && 
        new Date(c.subscription_end_date) <= sevenDaysFromNow &&
        new Date(c.subscription_end_date) >= new Date()
      );
    }
    
    setFilteredCompanies(filtered);
  }, [companies, searchTerm, planFilter, statusFilter]);

  const fetchData = async (action: string, params?: Record<string, any>) => {
    if (!session?.token) return null;
    
    try {
      const response = await fetch(
        'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session.token,
          },
          body: JSON.stringify({ action, params }),
        }
      );
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Error fetching ${action}:`, error);
      return null;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, companiesData, logsData] = await Promise.all([
        fetchData('get_dashboard_stats'),
        fetchData('get_companies'),
        fetchData('get_audit_log', { limit: 50 }),
      ]);
      
      if (statsData) setStats(statsData);
      if (companiesData) setCompanies(companiesData);
      if (logsData) setAuditLogs(logsData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCompany = async () => {
    if (!selectedCompany) return;
    
    setActionLoading(selectedCompany.id);
    try {
      const result = await fetchData('block_company', { 
        company_id: selectedCompany.id,
        reason: blockReason || 'Bloqueado pelo administrador'
      });
      
      if (result?.success) {
        toast.success('Empresa bloqueada com sucesso');
        setShowBlockDialog(false);
        setBlockReason('');
        loadData();
      } else {
        toast.error('Erro ao bloquear empresa');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockCompany = async (companyId: string) => {
    setActionLoading(companyId);
    try {
      const result = await fetchData('unblock_company', { company_id: companyId });
      
      if (result?.success) {
        toast.success('Empresa desbloqueada com sucesso');
        loadData();
      } else {
        toast.error('Erro ao desbloquear empresa');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateBranchLimit = async () => {
    if (!selectedCompany) return;
    
    setActionLoading(selectedCompany.id);
    try {
      const result = await fetchData('update_branch_limit', { 
        company_id: selectedCompany.id, 
        limit: newBranchLimit 
      });
      
      if (result?.success) {
        toast.success('Limite de filiais atualizado');
        setShowBranchLimitDialog(false);
        loadData();
      } else {
        toast.error('Erro ao atualizar limite');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedCompany || !newPlan) return;
    
    setActionLoading(selectedCompany.id);
    try {
      const planParams: Record<string, any> = { 
        company_id: selectedCompany.id, 
        plan: newPlan 
      };

      // Add end date for premium plans if provided
      if ((newPlan === 'premium_mensal' || newPlan === 'premium_anual') && newPlanEndDate) {
        planParams.end_date = newPlanEndDate;
      }

      // Add trial settings
      if (newPlan === 'trial') {
        planParams.trial_limit = newTrialLimit;
        planParams.reset_trial = resetTrial;
      }

      const result = await fetchData('update_company_plan', planParams);
      
      if (result?.success) {
        toast.success('Plano atualizado com sucesso');
        setShowPlanDialog(false);
        setNewPlanEndDate('');
        setResetTrial(false);
        loadData();
      } else {
        toast.error('Erro ao atualizar plano');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBranchCreation = async (companyId: string, currentValue: boolean) => {
    setActionLoading(companyId);
    try {
      const result = await fetchData('toggle_branch_creation', { 
        company_id: companyId,
        enabled: !currentValue
      });
      
      if (result?.success) {
        toast.success(result.message || 'Permissão de filiais atualizada');
        loadData();
      } else {
        toast.error('Erro ao atualizar permissão');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
    toast.success('Logout realizado');
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'premium_mensal':
        return <Badge className="bg-green-500 hover:bg-green-600"><Crown className="w-3 h-3 mr-1" />Premium Mensal</Badge>;
      case 'premium_anual':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Crown className="w-3 h-3 mr-1" />Premium Anual</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'pro':
        return <Badge variant="secondary">Pro</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getStatusBadge = (company: Company) => {
    if (company.is_blocked) {
      return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Bloqueado</Badge>;
    }
    
    if (company.subscription_end_date) {
      const endDate = new Date(company.subscription_end_date);
      const now = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft < 0) {
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expirado</Badge>;
      } else if (daysLeft <= 7) {
        return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />Expira em {daysLeft}d</Badge>;
      }
    }
    
    if (company.subscription_status === 'active') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
    }
    
    return <Badge variant="secondary">Inativo</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Super Admin</h1>
              <p className="text-xs text-muted-foreground">{session?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total_companies || 0}</p>
                  <p className="text-xs text-muted-foreground">Empresas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Crown className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.premium_companies || 0}</p>
                  <p className="text-xs text-muted-foreground">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <GitBranch className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total_branches || 0}</p>
                  <p className="text-xs text-muted-foreground">Filiais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.monthly_appointments || 0}</p>
                  <p className="text-xs text-muted-foreground">Agend. mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.expiring_companies || 0}</p>
                  <p className="text-xs text-muted-foreground">Vencendo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="companies" className="space-y-4">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="companies" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Empresas</span>
                <span className="sm:hidden">Emp.</span>
              </TabsTrigger>
              <TabsTrigger value="access" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Acessos</span>
                <span className="sm:hidden">Acess.</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Suporte</span>
                <span className="sm:hidden">Sup.</span>
              </TabsTrigger>
              <TabsTrigger value="branches" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <GitBranch className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Filiais</span>
                <span className="sm:hidden">Fil.</span>
              </TabsTrigger>
              <TabsTrigger value="company-mgmt" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Ger. Empresas</span>
                <span className="sm:hidden">Ger.</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Relatórios</span>
                <span className="sm:hidden">Rel.</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Auditoria</span>
                <span className="sm:hidden">Aud.</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="companies" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filtrar plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os planos</SelectItem>
                      <SelectItem value="premium_mensal">Premium Mensal</SelectItem>
                      <SelectItem value="premium_anual">Premium Anual</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filtrar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="blocked">Bloqueados</SelectItem>
                      <SelectItem value="expiring">Vencendo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Companies List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Empresas ({filteredCompanies.length})
                </CardTitle>
                <CardDescription>
                  Gerencie todas as empresas da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{company.name}</h3>
                            {getPlanBadge(company.plan)}
                            {getStatusBadge(company)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">E-mail:</span> {company.email}
                            </div>
                            <div>
                              <span className="font-medium">Filiais:</span> {company.branch_count}/{company.branch_limit || 5}
                            </div>
                            <div>
                              <span className="font-medium">Agendamentos:</span> {company.appointments_count || 0}
                            </div>
                            {(company.plan === 'trial' || company.plan === 'pro') && (
                              <div>
                                <span className="font-medium">Trial:</span> {company.trial_appointments_used}/{company.trial_appointments_limit}
                              </div>
                            )}
                            {company.subscription_end_date && (
                              <div>
                                <span className="font-medium">Vence:</span> {format(new Date(company.subscription_end_date), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant={company.can_create_branches ? "default" : "secondary"} className="text-xs">
                              <GitBranch className="w-3 h-3 mr-1" />
                              {company.can_create_branches ? 'Pode criar filiais' : 'Criação bloqueada'}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            Criada {formatDistanceToNow(new Date(company.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant={company.can_create_branches ? "secondary" : "default"}
                            size="sm"
                            onClick={() => handleToggleBranchCreation(company.id, company.can_create_branches)}
                            disabled={actionLoading === company.id}
                          >
                            {actionLoading === company.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <GitBranch className="w-3 h-3 mr-1" />
                            )}
                            {company.can_create_branches ? 'Bloquear Filiais' : 'Liberar Filiais'}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(company);
                              setNewBranchLimit(company.branch_limit || 5);
                              setShowBranchLimitDialog(true);
                            }}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Limite
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(company);
                              setNewPlan(company.plan);
                              setNewTrialLimit(company.trial_appointments_limit || 50);
                              if (company.subscription_end_date) {
                                setNewPlanEndDate(company.subscription_end_date.split('T')[0]);
                              } else {
                                setNewPlanEndDate('');
                              }
                              setShowPlanDialog(true);
                            }}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Plano
                          </Button>
                          
                          {company.is_blocked ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblockCompany(company.id)}
                              disabled={actionLoading === company.id}
                            >
                              {actionLoading === company.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Unlock className="w-3 h-3 mr-1" />
                              )}
                              Desbloquear
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedCompany(company);
                                setShowBlockDialog(true);
                              }}
                              disabled={actionLoading === company.id}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Bloquear
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {company.is_blocked && company.blocked_reason && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                          <strong>Motivo:</strong> {company.blocked_reason}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredCompanies.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma empresa encontrada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <UserAccessManagementTab />
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <UnifiedSupportTab />
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <BranchManagementTab />
          </TabsContent>

          <TabsContent value="company-mgmt" className="space-y-4">
            <CompanyManagementTab />
          </TabsContent>

          <TabsContent value="reports">
            <GlobalReportsTab sessionToken={session?.token || ''} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Log de Auditoria
                </CardTitle>
                <CardDescription>
                  Histórico de todas as ações administrativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border rounded-lg text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={log.action.includes('success') ? 'default' : 'secondary'}>
                          {log.action.replace('data_access_', '')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                      {log.ip_address && log.ip_address !== 'unknown' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          IP: {log.ip_address}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {auditLogs.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum registro de auditoria
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Branch Limit Dialog */}
      <Dialog open={showBranchLimitDialog} onOpenChange={setShowBranchLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Limite de Filiais</DialogTitle>
            <DialogDescription>
              Defina o número máximo de filiais para {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branchLimit">Limite de Filiais</Label>
              <Input
                id="branchLimit"
                type="number"
                min={1}
                max={100}
                value={newBranchLimit}
                onChange={(e) => setNewBranchLimit(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Atual: {selectedCompany?.branch_count || 0} filiais ativas
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBranchLimitDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateBranchLimit}
              disabled={actionLoading === selectedCompany?.id}
            >
              {actionLoading === selectedCompany?.id && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Bloquear Empresa</DialogTitle>
            <DialogDescription>
              Esta ação irá impedir o acesso de {selectedCompany?.name} à plataforma
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="blockReason">Motivo do Bloqueio</Label>
              <Input
                id="blockReason"
                placeholder="Ex: Inadimplência, violação de termos..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBlockCompany}
              disabled={actionLoading === selectedCompany?.id}
            >
              {actionLoading === selectedCompany?.id && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>
              Altere o plano de {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo Plano</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Limite de agendamentos)</SelectItem>
                  <SelectItem value="pro">Pro (Limite de agendamentos)</SelectItem>
                  <SelectItem value="premium_mensal">Premium Mensal (R$ 79,90/mês)</SelectItem>
                  <SelectItem value="premium_anual">Premium Anual (R$ 599,00/ano)</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelar Plano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Premium Plan Options */}
            {(newPlan === 'premium_mensal' || newPlan === 'premium_anual') && (
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={newPlanEndDate}
                  onChange={(e) => setNewPlanEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar a data padrão ({newPlan === 'premium_mensal' ? '30 dias' : '1 ano'})
                </p>
              </div>
            )}

            {/* Trial Plan Options */}
            {(newPlan === 'trial' || newPlan === 'pro') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Limite de Agendamentos do Trial</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={newTrialLimit}
                    onChange={(e) => setNewTrialLimit(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Atual: {selectedCompany?.trial_appointments_used || 0} usados de {selectedCompany?.trial_appointments_limit || 50}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="resetTrial"
                    checked={resetTrial}
                    onChange={(e) => setResetTrial(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="resetTrial" className="text-sm font-normal cursor-pointer">
                    Resetar contador de agendamentos usados para 0
                  </Label>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdatePlan}
              disabled={actionLoading === selectedCompany?.id || !newPlan}
            >
              {actionLoading === selectedCompany?.id && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
