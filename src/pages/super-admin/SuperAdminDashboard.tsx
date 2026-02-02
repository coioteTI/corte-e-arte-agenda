import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, LogOut, Building2, Users, Calendar, GitBranch, 
  Loader2, RefreshCw, Lock, Unlock, Eye, TrendingUp,
  Clock, AlertTriangle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  total_companies: number;
  total_branches: number;
  total_appointments: number;
  total_users: number;
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/super-admin/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

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

  const handleBlockCompany = async (companyId: string, block: boolean) => {
    setActionLoading(companyId);
    try {
      const action = block ? 'block_company' : 'unblock_company';
      const result = await fetchData(action, { company_id: companyId });
      
      if (result?.success) {
        toast.success(block ? 'Empresa bloqueada' : 'Empresa desbloqueada');
        loadData();
      } else {
        toast.error('Erro ao atualizar empresa');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePlan = async (companyId: string, plan: string) => {
    setActionLoading(companyId);
    try {
      const result = await fetchData('update_company_plan', { 
        company_id: companyId, 
        plan 
      });
      
      if (result?.success) {
        toast.success('Plano atualizado com sucesso');
        loadData();
      } else {
        toast.error('Erro ao atualizar plano');
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
        return <Badge className="bg-green-500">Premium Mensal</Badge>;
      case 'premium_anual':
        return <Badge className="bg-blue-500">Premium Anual</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'blocked':
        return <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Bloqueado</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <GitBranch className="w-5 h-5 text-green-600" />
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
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
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
                  <p className="text-2xl font-bold">{stats?.total_appointments || 0}</p>
                  <p className="text-xs text-muted-foreground">Agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="w-4 h-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Clock className="w-4 h-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Empresas Cadastradas ({companies.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{company.name}</h3>
                            {getPlanBadge(company.plan)}
                            {getStatusBadge(company.subscription_status || 'inactive')}
                          </div>
                          <p className="text-sm text-muted-foreground">{company.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Criada em: {format(new Date(company.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {company.plan === 'trial' && (
                            <p className="text-xs text-muted-foreground">
                              Trial: {company.trial_appointments_used}/{company.trial_appointments_limit} agendamentos
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdatePlan(company.id, 'premium_mensal')}
                            disabled={actionLoading === company.id}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Premium
                          </Button>
                          
                          {company.subscription_status === 'blocked' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBlockCompany(company.id, false)}
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
                              onClick={() => handleBlockCompany(company.id, true)}
                              disabled={actionLoading === company.id}
                            >
                              {actionLoading === company.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Lock className="w-3 h-3 mr-1" />
                              )}
                              Bloquear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {companies.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma empresa cadastrada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Log de Auditoria
                </CardTitle>
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
                          {log.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                      {log.ip_address && (
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
    </div>
  );
};

export default SuperAdminDashboard;
