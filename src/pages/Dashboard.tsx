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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardData.totalClientes}</p>
                  <p className="text-sm text-muted-foreground">Total de Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Scissors className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardData.totalServicos}</p>
                  <p className="text-sm text-muted-foreground">Serviços Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardData.totalProfissionais}</p>
                  <p className="text-sm text-muted-foreground">Profissionais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{dashboardData.totalAgendamentos}</p>
                  <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agendamentos de Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamentos de Hoje ({dashboardData.agendamentosHoje.length})
            </CardTitle>
            <Button onClick={() => navigate("/dashboard/agenda")}>
              Ver Agenda Completa
            </Button>
          </CardHeader>
          <CardContent>
            {dashboardData.agendamentosHoje.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Nenhum agendamento para hoje
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Que tal aproveitar para organizar sua agenda?
                </p>
                <Button 
                  className="mt-4" 
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium min-w-16">
                        {agendamento.appointment_time}
                      </div>
                      <div>
                        <div className="font-medium">{agendamento.clients?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {agendamento.services?.name} • {agendamento.professionals?.name}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`${getStatusColor(agendamento.status)} text-white`}
                    >
                      {getStatusText(agendamento.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Links Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/dashboard/clientes")}>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold">Gerenciar Clientes</h3>
              <p className="text-sm text-muted-foreground">
                Adicione e gerencie seus clientes
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/dashboard/servicos")}>
            <CardContent className="p-6 text-center">
              <Scissors className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold">Gerenciar Serviços</h3>
              <p className="text-sm text-muted-foreground">
                Configure seus serviços e preços
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/dashboard/profissionais")}>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold">Gerenciar Profissionais</h3>
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