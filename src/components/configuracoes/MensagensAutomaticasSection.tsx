import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bell } from "lucide-react";
import { MensagensAutomaticasConfig, MessageType } from "@/types/configuracoes";

interface MensagensAutomaticasSectionProps {
  mensagensAutomaticas: MensagensAutomaticasConfig;
  onEditMessage: (tipo: string) => void;
}

export const MensagensAutomaticasSection = ({ 
  mensagensAutomaticas, 
  onEditMessage 
}: MensagensAutomaticasSectionProps) => {
  const messageTypes: MessageType[] = [
    { 
      key: 'lembrete', 
      name: 'Lembrete de Agendamento', 
      description: 'Enviado 1 hora antes do agendamento',
      icon: Bell
    },
    { 
      key: 'confirmacao', 
      name: 'Confirmação de Agendamento', 
      description: 'Enviado após o agendamento ser confirmado',
      icon: MessageSquare
    },
    { 
      key: 'boasVindas', 
      name: 'Mensagem de Boas-vindas', 
      description: 'Enviado para novos clientes',
      icon: MessageSquare
    },
    { 
      key: 'cancelamento', 
      name: 'Cancelamento de Agendamento', 
      description: 'Enviado quando um agendamento é cancelado',
      icon: MessageSquare
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mensagens Automáticas Personalizadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {messageTypes.map((messageType) => {
            const IconComponent = messageType.icon;
            return (
              <div key={messageType.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-primary" />
                    <div>
                      <h4 className="font-medium">{messageType.name}</h4>
                      <p className="text-xs text-muted-foreground">{messageType.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditMessage(messageType.key)}
                  >
                    Editar
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded text-xs">
                  {mensagensAutomaticas[messageType.key as keyof typeof mensagensAutomaticas]}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};