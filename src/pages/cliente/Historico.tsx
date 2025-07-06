import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ClientLayout from "@/components/client/ClientLayout";
import { Eye } from "lucide-react";

const historicoExemplo = [
  {
    id: 1,
    barbearia: "Barbearia do João",
    servico: "Corte + Barba",
    data: "2024-01-15",
    horario: "14:00",
    status: "concluido",
    valor: 35.00,
    formaPagamento: "Dinheiro"
  },
  {
    id: 2,
    barbearia: "Salão Elegante",
    servico: "Corte Masculino",
    data: "2024-01-08",
    horario: "16:30",
    status: "concluido",
    valor: 25.00,
    formaPagamento: "PIX"
  },
  {
    id: 3,
    barbearia: "Barbearia Central",
    servico: "Barba",
    data: "2023-12-20",
    horario: "10:00",
    status: "cancelado",
    valor: 15.00,
    formaPagamento: "Cartão"
  },
];

const Historico = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido":
        return "bg-green-500";
      case "cancelado":
        return "bg-red-500";
      case "pendente":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "concluido":
        return "Concluído";
      case "cancelado":
        return "Cancelado";
      case "pendente":
        return "Pendente";
      default:
        return status;
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Histórico de Atendimentos</h1>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{historicoExemplo.length}</div>
              <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {historicoExemplo.filter(h => h.status === 'concluido').length}
              </div>
              <p className="text-sm text-muted-foreground">Atendimentos Concluídos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                R$ {historicoExemplo
                  .filter(h => h.status === 'concluido')
                  .reduce((acc, h) => acc + h.valor, 0)
                  .toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Total Gasto</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista do Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Histórico Completo ({historicoExemplo.length} atendimentos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicoExemplo.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.barbearia}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.servico}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(item.data).toLocaleDateString("pt-BR")} às {item.horario}
                    </div>
                    {item.status === 'concluido' && (
                      <div className="text-sm text-muted-foreground">
                        R$ {item.valor.toFixed(2)} • {item.formaPagamento}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant="secondary"
                      className={`${getStatusColor(item.status)} text-white`}
                    >
                      {getStatusText(item.status)}
                    </Badge>
                    
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default Historico;