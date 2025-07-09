import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Clock, User, Scissors } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// Start with empty data for new companies
const agendamentosHoje: any[] = [];
const horariosDisponiveis: string[] = [];

const Horarios = () => {
  const [selectedProfessional, setSelectedProfessional] = useState<string>("Todos");
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handleViewDetails = (agendamento: any) => {
    setSelectedAgendamento(agendamento);
    setIsDetailsDialogOpen(true);
  };

  const handleProfessionalFilter = (professional: string) => {
    setSelectedProfessional(professional);
  };

  const filteredAgendamentos = selectedProfessional === "Todos" 
    ? agendamentosHoje 
    : agendamentosHoje.filter(ag => ag.profissional === selectedProfessional);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "bg-blue-500";
      case "em_andamento":
        return "bg-yellow-500";
      case "concluido":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "agendado":
        return "Agendado";
      case "em_andamento":
        return "Em andamento";
      case "concluido":
        return "Concluído";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Horários</h1>
          <div className="text-sm text-muted-foreground capitalize">
            {dataHoje}
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{filteredAgendamentos.length}</div>
              <p className="text-sm text-muted-foreground">
                {selectedProfessional === "Todos" ? "Clientes Agendados" : `Agendamentos - ${selectedProfessional}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{horariosDisponiveis.length}</div>
              <p className="text-sm text-muted-foreground">Vagas Disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {agendamentosHoje.length + horariosDisponiveis.length}
              </div>
              <p className="text-sm text-muted-foreground">Total de Horários</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clientes Agendados Hoje */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes Agendados Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAgendamentos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {selectedProfessional === "Todos" 
                      ? "Nenhum cliente agendado para hoje"
                      : `Nenhum agendamento para ${selectedProfessional} hoje`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Aproveite para organizar o ambiente!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAgendamentos.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium min-w-[50px] bg-muted rounded px-2 py-1">
                          {agendamento.horario}
                        </div>
                        <div>
                          <div className="font-medium">{agendamento.cliente}</div>
                          <div className="text-sm text-muted-foreground">
                            {agendamento.servico} • {agendamento.profissional}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary"
                          className={`${getStatusColor(agendamento.status)} text-white`}
                        >
                          {getStatusText(agendamento.status)}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(agendamento)}
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum profissional cadastrado ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Cadastre profissionais na seção de Configurações para começar.
              </p>
            </div>
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
                </div>
                
                <Separator />
                
                <div className="flex space-x-2">
                  <Button className="flex-1">
                    Iniciar Atendimento
                  </Button>
                  <Button variant="outline" className="flex-1">
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