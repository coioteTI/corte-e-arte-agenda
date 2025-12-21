import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Scissors, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    agendamentosHoje: [],
    totalClientes: 0,
    totalServicos: 0,
    totalProfissionais: 0,
    totalAgendamentos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get company ID
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      const today = format(new Date(), 'yyyy-MM-dd');

      // Load all dashboard data in parallel
      const [
        appointmentsToday,
        totalServices,
        totalProfessionals,
        totalAppointments
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            clients(name),
            services(name),
            professionals(name)
          `)
          .eq('company_id', company.id)
          .eq('appointment_date', today)
          .order('appointment_time'),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('professionals').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('company_id', company.id)
      ]);

      // Count unique clients that have appointments with this company
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('company_id', company.id);

      const uniqueClientIds = [...new Set(allAppointments?.map(apt => apt.client_id).filter(Boolean) || [])];
      const totalClientes = uniqueClientIds.length;

      setDashboardData({
        agendamentosHoje: appointmentsToday.data || [],
        totalClientes,
        totalServicos: totalServices.count || 0,
        totalProfissionais: totalProfessionals.count || 0,
        totalAgendamentos: totalAppointments.count || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="px-2 sm:px-0">
          <h1 className="text-xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 px-2 sm:px-0">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.totalClientes}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total de Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <Scissors className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.totalServicos}</p>
                  <p className="text-sm text-muted-foreground mt-1">Serviços Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.totalProfissionais}</p>
                  <p className="text-sm text-muted-foreground mt-1">Profissionais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{dashboardData.totalAgendamentos}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total de Agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos de Hoje */}
        <div className="px-2 sm:px-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Calendar className="h-5 w-5" />
                Agendamentos de Hoje ({dashboardData.agendamentosHoje.length})
              </CardTitle>
              <Button 
                onClick={() => navigate("/dashboard/agenda")}
                size="sm"
              >
                Ver Agenda Completa
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {dashboardData.agendamentosHoje.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">
                    Nenhum agendamento para hoje
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Que tal aproveitar para organizar sua agenda?
                  </p>
                  <Button 
                    className="mt-6" 
                    onClick={() => navigate("/dashboard/agenda")}
                  >
                    Criar Agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.agendamentosHoje.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="text-sm font-semibold min-w-[60px] text-primary">
                          {agendamento.appointment_time}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-base truncate">{agendamento.clients?.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {agendamento.services?.name} • {agendamento.professionals?.name}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary"
                        className={`${getStatusColor(agendamento.status)} text-white shrink-0`}
                      >
                        {getStatusText(agendamento.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Links Rápidos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-2 sm:px-0">
          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => navigate("/dashboard/clientes")}>
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-base mb-2">Gerenciar Clientes</h3>
              <p className="text-sm text-muted-foreground">
                Adicione e gerencie seus clientes
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => navigate("/dashboard/servicos")}>
            <CardContent className="p-6 text-center">
              <Scissors className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-base mb-2">Gerenciar Serviços</h3>
              <p className="text-sm text-muted-foreground">
                Configure seus serviços e preços
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => navigate("/dashboard/profissionais")}>
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-base mb-2">Gerenciar Profissionais</h3>
              <p className="text-sm text-muted-foreground">
                Adicione sua equipe de profissionais
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;