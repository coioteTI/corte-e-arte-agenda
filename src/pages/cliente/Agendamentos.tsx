import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ClientLayout from "@/components/client/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";

const agendamentosExemplo = [
  {
    id: 1,
    barbearia: "Barbearia do João",
    servico: "Corte + Barba",
    data: "2024-01-20",
    horario: "14:00",
    status: "confirmado",
    endereco: "Rua das Flores, 123 - Centro",
    telefone: "(11) 99999-9999",
    valor: 35.00
  },
  {
    id: 2,
    barbearia: "Salão Elegante",
    servico: "Corte Masculino",
    data: "2024-01-25",
    horario: "16:30",
    status: "pendente",
    endereco: "Av. Principal, 456 - Jardim",
    telefone: "(11) 88888-8888",
    valor: 25.00
  },
];

const Agendamentos = () => {
  const [agendamentos, setAgendamentos] = useState(agendamentosExemplo);
  const { toast } = useToast();

  const handleCancelAgendamento = (id: number) => {
    setAgendamentos(prev => 
      prev.map(agendamento => 
        agendamento.id === id 
          ? { ...agendamento, status: 'cancelado' }
          : agendamento
      )
    );
    
    toast({
      title: "Agendamento cancelado",
      description: "Seu agendamento foi cancelado com sucesso.",
      variant: "destructive"
    });
  };

  const handleConfirmarPresenca = (id: number) => {
    setAgendamentos(prev => 
      prev.map(agendamento => 
        agendamento.id === id 
          ? { ...agendamento, status: 'confirmado' }
          : agendamento
      )
    );
    
    toast({
      title: "Presença confirmada",
      description: "Sua presença foi confirmada com sucesso.",
    });
  };

  const handleConcluirServico = (id: number) => {
    setAgendamentos(prev => 
      prev.map(agendamento => 
        agendamento.id === id 
          ? { ...agendamento, status: 'concluido' }
          : agendamento
      )
    );
    
    toast({
      title: "Serviço concluído",
      description: "Obrigado por utilizar nossos serviços!",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmado":
        return "bg-green-500";
      case "pendente":
        return "bg-yellow-500";
      case "cancelado":
        return "bg-red-500";
      case "concluido":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmado":
        return "Confirmado";
      case "pendente":
        return "Pendente";
      case "cancelado":
        return "Cancelado";
      case "concluido":
        return "Concluído";
      default:
        return status;
    }
  };

  const agendamentosAtivos = agendamentos.filter(a => 
    a.status !== 'cancelado' && a.status !== 'concluido'
  );

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Meus Agendamentos</h1>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{agendamentosAtivos.length}</div>
              <p className="text-sm text-muted-foreground">Agendamentos Ativos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {agendamentos.filter(a => a.status === 'confirmado').length}
              </div>
              <p className="text-sm text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {agendamentos.filter(a => a.status === 'pendente').length}
              </div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Próximos Agendamentos ({agendamentosAtivos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agendamentosAtivos.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Você não tem agendamentos ativos
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Que tal agendar um novo serviço?
                </p>
                <Button className="mt-4" onClick={() => window.location.href = '/buscar-barbearias'}>
                  Buscar Barbearias
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {agendamentosAtivos.map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{agendamento.barbearia}</div>
                      <div className="text-sm text-muted-foreground">
                        {agendamento.servico} • R$ {agendamento.valor.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(agendamento.data).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {agendamento.horario}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {agendamento.endereco}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge 
                        variant="secondary"
                        className={`${getStatusColor(agendamento.status)} text-white`}
                      >
                        {getStatusText(agendamento.status)}
                      </Badge>
                      
                      <div className="flex space-x-2">
                        {agendamento.status === 'pendente' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleConfirmarPresenca(agendamento.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirmar Presença
                          </Button>
                        )}
                        
                        {(agendamento.status === 'confirmado' || agendamento.status === 'pendente') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Não, manter</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleCancelAgendamento(agendamento.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Sim, cancelar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default Agendamentos;