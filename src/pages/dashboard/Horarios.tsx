import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Clock, User, Scissors, Calendar, Users, Phone, DollarSign } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { LoadingSkeleton, ErrorState } from "@/components/LoadingState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useBranch } from "@/contexts/BranchContext";

const Horarios = () => {
  const [selectedProfessional, setSelectedProfessional] = useState<string>("Todos");
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBranchId, setLastBranchId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentBranchId, userRole, companyId: branchCompanyId, loading: branchLoading } = useBranch();
  const shouldFilterByBranch = userRole !== 'ceo' && !!currentBranchId;
  
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const fetchProfessionals = useCallback(async (companyId: string) => {
    let query = supabase
      .from('professionals')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    
    if (shouldFilterByBranch && currentBranchId) {
      query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
    }

    const { data } = await query;
    return data || [];
  }, [shouldFilterByBranch, currentBranchId]);

  const fetchTodayAppointments = useCallback(async (companyId: string) => {
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('appointments')
      .select(`*, services(name, price), professionals(name), clients(name, phone)`)
      .eq('company_id', companyId)
      .eq('appointment_date', today)
      .order('appointment_time');
    
    if (shouldFilterByBranch && currentBranchId) {
      query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
    }

    const { data } = await query;
    return data || [];
  }, [shouldFilterByBranch, currentBranchId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) {
        setError('Empresa não encontrada');
        return;
      }

      // Timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tempo limite excedido')), 15000)
      );

      const [professionalsData, appointmentsData] = await Promise.race([
        Promise.all([
          fetchProfessionals(company.id),
          fetchTodayAppointments(company.id)
        ]),
        timeoutPromise
      ]) as any[];

      setProfessionals(professionalsData);
      setAppointments(appointmentsData);
      setLastBranchId(currentBranchId);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os horários. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchProfessionals, fetchTodayAppointments, currentBranchId, toast]);

  // Reload when branch changes
  useEffect(() => {
    if (branchLoading) return;
    
    if (lastBranchId !== currentBranchId) {
      setAppointments([]);
      setProfessionals([]);
      loadData();
    }
  }, [currentBranchId, branchLoading, lastBranchId, loadData]);

  // Initial load
  useEffect(() => {
    if (!branchLoading && lastBranchId === null) {
      loadData();
    }
  }, [branchLoading, lastBranchId, loadData]);

  const agendamentosHoje = appointments.map(apt => ({
    id: apt.id,
    cliente: apt.clients?.name || 'Cliente',
    servico: apt.services?.name || 'Serviço',
    horario: apt.appointment_time?.slice(0, 5) || '',
    status: apt.status,
    telefone: apt.clients?.phone || '',
    profissional: apt.professionals?.name || 'Profissional',
    valor: apt.services?.price || 0,
    observacoes: apt.notes || ''
  }));

  const horariosDisponiveis = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", 
    "16:00", "16:30", "17:00", "17:30"
  ].filter(horario => {
    const isOccupied = agendamentosHoje.some(apt => apt.horario === horario);
    return !isOccupied;
  });

  const handleViewDetails = (agendamento: any) => {
    setSelectedAgendamento(agendamento);
    setIsDetailsDialogOpen(true);
  };

  const handleProfessionalFilter = (professional: string) => {
    setSelectedProfessional(professional);
  };

  const handleConcluirAtendimento = async (appointment: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Atendimento concluído!",
        description: `Atendimento de ${appointment.cliente} foi finalizado com sucesso.`
      });

      setIsDetailsDialogOpen(false);
      loadData(); // Reload appointments
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir o atendimento.",
        variant: "destructive"
      });
    }
  };

  const handleIniciarAtendimento = async (appointment: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Atendimento iniciado!",
        description: `Atendimento de ${appointment.cliente} foi iniciado.`
      });

      setIsDetailsDialogOpen(false);
      loadData(); // Reload appointments
    } catch (error) {
      console.error('Error starting appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o atendimento.",
        variant: "destructive"
      });
    }
  };

  const handleRemarcar = (appointment: any) => {
    // Close dialog first
    setIsDetailsDialogOpen(false);
    
    // Navigate to agenda page with appointment data for rescheduling
    navigate('/dashboard/agenda', { 
      state: { 
        appointmentToReschedule: {
          id: appointment.id,
          cliente: appointment.cliente,
          servico: appointment.servico,
          profissional: appointment.profissional,
          horarioAtual: appointment.horario,
          dataAtual: new Date().toLocaleDateString('pt-BR')
        }
      } 
    });
    
    toast({
      title: "Redirecionando para Agenda",
      description: `Selecione uma nova data/hora para ${appointment.cliente}`
    });
  };

  const filteredAgendamentos = selectedProfessional === "Todos" 
    ? agendamentosHoje 
    : agendamentosHoje.filter(ag => ag.profissional === selectedProfessional);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
      case "agendado":
        return "bg-blue-500";
      case "confirmed":
      case "em_andamento":
        return "bg-yellow-500";
      case "completed":
      case "concluido":
        return "bg-green-500";
      case "cancelled":
      case "cancelado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled":
      case "agendado":
        return "Agendado";
      case "confirmed":
      case "em_andamento":
        return "Confirmado";
      case "completed":
      case "concluido":
        return "Concluído";
      case "cancelled":
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (loading || branchLoading) {
    return (
      <DashboardLayout>
        <LoadingSkeleton cards={3} showHeader={true} />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={loadData} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 px-2 sm:px-0">
          <h1 className="text-xl sm:text-2xl font-semibold">Horários</h1>
          <div className="text-xs sm:text-sm text-muted-foreground capitalize">
            {dataHoje}
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 px-2 sm:px-0">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{agendamentosHoje.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Agendamentos Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{horariosDisponiveis.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Horários Livres</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{appointments.length > 0 ? '1+' : '0'}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Profissionais Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 px-2 sm:px-0">
          {/* Clientes Agendados Hoje */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Clientes Agendados Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAgendamentos.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {selectedProfessional === "Todos" 
                      ? "Nenhum cliente agendado para hoje"
                      : `Nenhum agendamento para ${selectedProfessional} hoje`
                    }
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    Aproveite para organizar o ambiente!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredAgendamentos.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-2 sm:space-y-0"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium min-w-12 sm:min-w-14 bg-muted rounded px-2 py-1">
                          {agendamento.horario}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base truncate">{agendamento.cliente}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            {agendamento.servico} • {agendamento.profissional}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-2">
                        <Badge 
                          variant="secondary"
                          className={`${getStatusColor(agendamento.status)} text-white text-xs`}
                        >
                          {getStatusText(agendamento.status)}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(agendamento)}
                          className="text-xs h-7 px-2"
                        >
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vagas Disponíveis */}
          <Card>
            <CardHeader>
              <CardTitle>Vagas Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              {horariosDisponiveis.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Todos os horários estão ocupados
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Agenda cheia para hoje!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {horariosDisponiveis.map((horario) => (
                    <Button
                      key={horario}
                      variant="outline"
                      size="sm"
                      className="justify-center"
                    >
                      {horario}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filtros por Profissional */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum profissional cadastrado ainda.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cadastre profissionais na seção de Profissionais para começar.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedProfessional === "Todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleProfessionalFilter("Todos")}
                >
                  Todos ({agendamentosHoje.length})
                </Button>
                {professionals.map((professional) => {
                  const count = agendamentosHoje.filter(ag => ag.profissional === professional.name).length;
                  return (
                    <Button
                      key={professional.id}
                      variant={selectedProfessional === professional.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleProfessionalFilter(professional.name)}
                    >
                      {professional.name} ({count})
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Detalhes do Agendamento
              </DialogTitle>
              <DialogDescription>
                Visualize as informações completas deste agendamento.
              </DialogDescription>
            </DialogHeader>
            {selectedAgendamento && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">
                    {selectedAgendamento.horario}
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`${getStatusColor(selectedAgendamento.status)} text-white`}
                  >
                    {getStatusText(selectedAgendamento.status)}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Cliente</div>
                      <div className="font-medium">{selectedAgendamento.cliente}</div>
                    </div>
                  </div>

                  {selectedAgendamento.telefone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Telefone</div>
                        <div className="font-medium">{selectedAgendamento.telefone}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Serviço</div>
                      <div className="font-medium">{selectedAgendamento.servico}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Profissional</div>
                      <div className="font-medium">{selectedAgendamento.profissional}</div>
                    </div>
                  </div>

                  {selectedAgendamento.valor > 0 && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Valor</div>
                        <div className="font-medium">R$ {selectedAgendamento.valor.toFixed(2)}</div>
                      </div>
                    </div>
                  )}

                  {selectedAgendamento.observacoes && (
                    <div>
                      <div className="text-sm text-muted-foreground">Observações</div>
                      <div className="font-medium">{selectedAgendamento.observacoes}</div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex space-x-2">
                  {selectedAgendamento?.status === 'scheduled' ? (
                    <Button 
                      className="flex-1"
                      onClick={() => handleIniciarAtendimento(selectedAgendamento)}
                    >
                      Iniciar Atendimento
                    </Button>
                  ) : selectedAgendamento?.status === 'confirmed' ? (
                    <Button 
                      className="flex-1"
                      onClick={() => handleConcluirAtendimento(selectedAgendamento)}
                    >
                      Concluir Atendimento
                    </Button>
                  ) : (
                    <Button className="flex-1" disabled>
                      {selectedAgendamento?.status === 'completed' ? 'Concluído' : 'Ação não disponível'}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleRemarcar(selectedAgendamento)}
                    disabled={selectedAgendamento?.status === 'completed'}
                  >
                    Remarcar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Horarios;