import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ptBR } from "date-fns/locale";
import { startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { ComprovanteModal } from "@/components/ComprovanteModal";
import { FileText } from "lucide-react";

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedView, setSelectedView] = useState<"day" | "week">("day");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<any>(null);
  const [comprovanteModalOpen, setComprovanteModalOpen] = useState(false);
  const [selectedComprovante, setSelectedComprovante] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [novoAgendamento, setNovoAgendamento] = useState({
    client_id: "",
    service_id: "",
    professional_id: "",
    appointment_date: "",
    appointment_time: ""
  });
  
  const { 
    agendamentos, 
    clients, 
    services, 
    professionals, 
    companyId, 
    loading, 
    error, 
    refreshData 
  } = useAgendamentos();
  
  const { toast } = useToast();

  const handleNovoAgendamento = useCallback(async () => {
    if (!novoAgendamento.client_id || !novoAgendamento.service_id || !novoAgendamento.professional_id || !novoAgendamento.appointment_date || !novoAgendamento.appointment_time) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Erro",
        description: "Company ID não encontrado. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Adding appointment with company_id:', companyId);
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: novoAgendamento.client_id,
          service_id: novoAgendamento.service_id,
          professional_id: novoAgendamento.professional_id,
          appointment_date: novoAgendamento.appointment_date,
          appointment_time: novoAgendamento.appointment_time,
          company_id: companyId,
          status: 'scheduled'
        });

      if (error) throw error;

      // Send calendar invite if client email is available
      const clientData = clients.find(c => c.id === novoAgendamento.client_id);
      const serviceData = services.find(s => s.id === novoAgendamento.service_id);
      
      if (clientData?.email && clientData?.name) {
        try {
          await supabase.functions.invoke('send-appointment-calendar', {
            body: {
              clientName: clientData.name,
              clientEmail: clientData.email,
              appointmentDate: novoAgendamento.appointment_date,
              appointmentTime: novoAgendamento.appointment_time,
              serviceName: serviceData?.name,
              companyName: 'Corte & Arte', // This could be dynamic
              companyAddress: 'Online' // This could be dynamic
            }
          });
          
          console.log('Calendar invite sent successfully');
        } catch (emailError) {
          console.error('Erro ao enviar convite de calendário:', emailError);
        }
      }

      setNovoAgendamento({
        client_id: "",
        service_id: "",
        professional_id: "",
        appointment_date: "",
        appointment_time: ""
      });
      setIsDialogOpen(false);
      await refreshData(); // Reload data
      
      toast({
        title: "Sucesso",
        description: "Agendamento criado e convite de calendário enviado!"
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento",
        variant: "destructive"
      });
    }
  }, [novoAgendamento, companyId, refreshData, toast, clients, services]);

  const handleConcluirAgendamento = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;

      await refreshData(); // Reload data
      toast({
        title: "Agendamento concluído",
        description: "Status atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o agendamento",
        variant: "destructive"
      });
    }
  }, [refreshData, toast]);

  const handleEditAgendamento = useCallback((agendamento: any) => {
    setEditingAgendamento(agendamento);
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingAgendamento) return;
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_time: editingAgendamento.appointment_time,
          appointment_date: editingAgendamento.appointment_date
        })
        .eq('id', editingAgendamento.id);

      if (error) throw error;

      setIsEditDialogOpen(false);
      setEditingAgendamento(null);
      await refreshData(); // Reload data
      
      toast({
        title: "Agendamento atualizado",
        description: "As alterações foram salvas com sucesso!"
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o agendamento",
        variant: "destructive"
      });
    }
  }, [editingAgendamento, refreshData, toast]);

  const handleCancelAgendamento = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setIsEditDialogOpen(false);
      setEditingAgendamento(null);
      await refreshData(); // Reload data
      
      toast({
        title: "Agendamento cancelado",
        description: "O agendamento foi cancelado com sucesso!"
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento",
        variant: "destructive"
      });
    }
  }, [refreshData, toast]);

  const getFilteredAgendamentos = useMemo(() => {
    if (!selectedDate) return agendamentos;
    
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
    
    if (selectedView === "day") {
      return agendamentos.filter(ag => ag.appointment_date === selectedDateString);
    } else {
      // Visualização semanal
      const weekStart = startOfWeek(selectedDate, { locale: ptBR });
      const weekEnd = endOfWeek(selectedDate, { locale: ptBR });
      return agendamentos.filter(ag => {
        const agDate = new Date(ag.appointment_date);
        return isWithinInterval(agDate, { start: weekStart, end: weekEnd });
      });
    }
  }, [selectedDate, selectedView, agendamentos]);

  const agendamentosDoDay = getFilteredAgendamentos;

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      case "pending":
        return "Em Andamento";
      default:
        return status;
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 px-2 sm:px-0">
          <h1 className="text-xl sm:text-2xl font-semibold">Agenda</h1>
          <div className="flex space-x-2">
            <Button
              variant={selectedView === "day" ? "default" : "outline"}
              onClick={() => setSelectedView("day")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Dia
            </Button>
            <Button
              variant={selectedView === "week" ? "default" : "outline"}
              onClick={() => setSelectedView("week")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Semana
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 px-2 sm:px-0">
          {/* Calendário */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="rounded-md border w-full"
              />
            </CardContent>
          </Card>

          {/* Lista de Agendamentos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <CardTitle className="text-base sm:text-lg">
                  Agendamentos - {selectedDate?.toLocaleDateString("pt-BR")}
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="text-xs sm:text-sm">Novo Agendamento</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Agendamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cliente">Cliente*</Label>
                        <Select value={novoAgendamento.client_id} onValueChange={(value) => setNovoAgendamento({...novoAgendamento, client_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                Nenhum cliente cadastrado ainda
                              </div>
                            ) : (
                              clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="servico">Serviço*</Label>
                        <Select value={novoAgendamento.service_id} onValueChange={(value) => setNovoAgendamento({...novoAgendamento, service_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                Nenhum serviço cadastrado ainda
                              </div>
                            ) : (
                              services.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="profissional">Profissional*</Label>
                        <Select value={novoAgendamento.professional_id} onValueChange={(value) => setNovoAgendamento({...novoAgendamento, professional_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o profissional" />
                          </SelectTrigger>
                          <SelectContent>
                            {professionals.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                Nenhum profissional cadastrado ainda
                              </div>
                            ) : (
                              professionals.map((professional) => (
                                <SelectItem key={professional.id} value={professional.id}>
                                  {professional.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="data">Data*</Label>
                          <Input
                            id="data"
                            type="date"
                            value={novoAgendamento.appointment_date}
                            onChange={(e) => setNovoAgendamento({...novoAgendamento, appointment_date: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="horario">Horário*</Label>
                          <Input
                            id="horario"
                            type="time"
                            value={novoAgendamento.appointment_time}
                            onChange={(e) => setNovoAgendamento({...novoAgendamento, appointment_time: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button onClick={handleNovoAgendamento} className="flex-1">
                          Criar Agendamento
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agendamentosDoDay.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium">
                          {agendamento.appointment_time}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{agendamento.clients?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {agendamento.services?.name} • {agendamento.professionals?.name}
                          </div>
                          {agendamento.pix_payment_proof && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                PIX
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs p-1 h-auto"
                                onClick={() => {
                                  setSelectedComprovante(agendamento.pix_payment_proof);
                                  setSelectedClientName(agendamento.clients?.name || "Cliente");
                                  setComprovanteModalOpen(true);
                                }}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Ver Comprovante
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-2">
                        <Badge 
                          variant="secondary"
                          className={`${getStatusColor(agendamento.status)} text-white text-xs`}
                        >
                          {getStatusText(agendamento.status)}
                        </Badge>
                        <div className="flex gap-1 sm:space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditAgendamento(agendamento)}
                            className="text-xs px-2 py-1 h-7 sm:h-8 sm:px-3 sm:py-2 sm:text-sm"
                          >
                            Editar
                          </Button>
                          {(agendamento.status === "scheduled" || agendamento.status === "pending") && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleConcluirAgendamento(agendamento.id)}
                              className="text-xs px-2 py-1 h-7 sm:h-8 sm:px-3 sm:py-2 sm:text-sm"
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {agendamentosDoDay.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum agendamento para esta data
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Cadastre clientes, serviços e profissionais para começar a agendar
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Agendamento</DialogTitle>
            </DialogHeader>
            {editingAgendamento && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-data">Data*</Label>
                  <Input
                    id="edit-data"
                    type="date"
                    value={editingAgendamento.appointment_date}
                    onChange={(e) => setEditingAgendamento({
                      ...editingAgendamento, 
                      appointment_date: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-horario">Horário*</Label>
                  <Input
                    id="edit-horario"
                    type="time"
                    value={editingAgendamento.appointment_time}
                    onChange={(e) => setEditingAgendamento({
                      ...editingAgendamento, 
                      appointment_time: e.target.value
                    })}
                  />
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleSaveEdit} className="flex-1">
                    Salvar Alterações
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleCancelAgendamento(editingAgendamento.id)}
                    className="flex-1"
                  >
                    Cancelar Agendamento
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Comprovante Modal */}
        <ComprovanteModal
          open={comprovanteModalOpen}
          onOpenChange={setComprovanteModalOpen}
          comprovanteUrl={selectedComprovante}
          clientName={selectedClientName}
        />
      </div>
    </DashboardLayout>
  );
};

export default memo(Agenda);