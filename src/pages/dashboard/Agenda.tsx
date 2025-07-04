import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

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
                <Button>Novo Agendamento</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agendamentosExemplo.map((agendamento) => (
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
                            <Button size="sm" variant="outline">
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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