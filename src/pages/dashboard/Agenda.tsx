import { useState } from "react";
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

const agendamentosExemplo = [
  {
    id: 1,
    cliente: "João Silva",
    servico: "Corte + Barba",
    horario: "09:00",
    status: "agendado",
    profissional: "Pedro"
  },
  {
    id: 2,
    cliente: "Maria Santos",
    servico: "Corte Feminino",
    horario: "10:30",
    status: "concluido",
    profissional: "Ana"
  },
  {
    id: 3,
    cliente: "Carlos Oliveira",
    servico: "Barba",
    horario: "14:00",
    status: "agendado",
    profissional: "Pedro"
  },
];

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedView, setSelectedView] = useState<"day" | "week">("day");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState({
    cliente: "",
    servico: "",
    profissional: "",
    data: "",
    horario: ""
  });
  const [agendamentos, setAgendamentos] = useState(agendamentosExemplo);
  const { toast } = useToast();

  const handleNovoAgendamento = () => {
    if (!novoAgendamento.cliente || !novoAgendamento.servico || !novoAgendamento.profissional || !novoAgendamento.data || !novoAgendamento.horario) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const agendamento = {
      id: Date.now(),
      cliente: novoAgendamento.cliente,
      servico: novoAgendamento.servico,
      horario: novoAgendamento.horario,
      status: "agendado" as const,
      profissional: novoAgendamento.profissional
    };

    setAgendamentos([...agendamentos, agendamento]);
    setNovoAgendamento({
      cliente: "",
      servico: "",
      profissional: "",
      data: "",
      horario: ""
    });
    setIsDialogOpen(false);
    
    toast({
      title: "Sucesso",
      description: "Agendamento criado com sucesso!"
    });
  };

  const handleConcluirAgendamento = (id: number) => {
    setAgendamentos(agendamentos.map(ag => 
      ag.id === id ? { ...ag, status: "concluido" as const } : ag
    ));
    toast({
      title: "Agendamento concluído",
      description: "Status atualizado com sucesso!"
    });
  };

  const agendamentosDoDay = selectedDate 
    ? agendamentos.filter(ag => {
        const today = selectedDate.toDateString();
        const agendamentoDate = new Date().toDateString(); // Simular data do agendamento
        return today === agendamentoDate;
      })
    : agendamentos;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado":
        return "bg-blue-500";
      case "concluido":
        return "bg-green-500";
      case "cancelado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "agendado":
        return "Agendado";
      case "concluido":
        return "Concluído";
      case "cancelado":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <div className="flex space-x-2">
            <Button
              variant={selectedView === "day" ? "default" : "outline"}
              onClick={() => setSelectedView("day")}
            >
              Dia
            </Button>
            <Button
              variant={selectedView === "week" ? "default" : "outline"}
              onClick={() => setSelectedView("week")}
            >
              Semana
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
              />
            </CardContent>
          </Card>

          {/* Lista de Agendamentos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Agendamentos - {selectedDate?.toLocaleDateString("pt-BR")}
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Novo Agendamento</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Agendamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cliente">Nome do Cliente*</Label>
                        <Input
                          id="cliente"
                          placeholder="Nome completo"
                          value={novoAgendamento.cliente}
                          onChange={(e) => setNovoAgendamento({...novoAgendamento, cliente: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="servico">Serviço*</Label>
                        <Select value={novoAgendamento.servico} onValueChange={(value) => setNovoAgendamento({...novoAgendamento, servico: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Corte + Barba">Corte + Barba</SelectItem>
                            <SelectItem value="Corte Masculino">Corte Masculino</SelectItem>
                            <SelectItem value="Corte Feminino">Corte Feminino</SelectItem>
                            <SelectItem value="Barba">Barba</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="profissional">Profissional*</Label>
                        <Select value={novoAgendamento.profissional} onValueChange={(value) => setNovoAgendamento({...novoAgendamento, profissional: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o profissional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pedro">Pedro</SelectItem>
                            <SelectItem value="Ana">Ana</SelectItem>
                            <SelectItem value="Carlos">Carlos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="data">Data*</Label>
                          <Input
                            id="data"
                            type="date"
                            value={novoAgendamento.data}
                            onChange={(e) => setNovoAgendamento({...novoAgendamento, data: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="horario">Horário*</Label>
                          <Input
                            id="horario"
                            type="time"
                            value={novoAgendamento.horario}
                            onChange={(e) => setNovoAgendamento({...novoAgendamento, horario: e.target.value})}
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
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                          {agendamento.status === "agendado" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleConcluirAgendamento(agendamento.id)}
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Agenda;