import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

const agendamentosHoje = [
  {
    id: 1,
    cliente: "João Silva",
    servico: "Corte + Barba",
    horario: "09:00",
    profissional: "Pedro",
    status: "agendado"
  },
  {
    id: 2,
    cliente: "Maria Santos",
    servico: "Corte Feminino",
    horario: "10:30",
    profissional: "Ana",
    status: "em_andamento"
  },
  {
    id: 3,
    cliente: "Carlos Oliveira",
    servico: "Barba",
    horario: "14:00",
    profissional: "Pedro",
    status: "agendado"
  },
  {
    id: 4,
    cliente: "Ana Costa",
    servico: "Corte Masculino",
    horario: "16:30",
    profissional: "Pedro",
    status: "agendado"
  },
];

const horariosDisponiveis = [
  "11:00", "11:30", "12:00", "13:00", "13:30", "15:00", "15:30", "17:00", "17:30", "18:00"
];

const Horarios = () => {
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

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
              <div className="text-2xl font-bold">{agendamentosHoje.length}</div>
              <p className="text-sm text-muted-foreground">Clientes Agendados</p>
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
              {agendamentosHoje.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum cliente agendado para hoje
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Aproveite para organizar o ambiente!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {agendamentosHoje.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium min-w-[50px]">
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
                        <Button size="sm" variant="outline">
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
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                Todos
              </Button>
              <Button variant="outline" size="sm">
                Pedro
              </Button>
              <Button variant="outline" size="sm">
                Ana
              </Button>
              <Button variant="outline" size="sm">
                Carlos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Horarios;