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
        <p className="text-sm text-muted-foreground mb-4">
          Configure mensagens personalizadas para diferentes tipos de notificações. 
          Use variáveis como {"{nome}"}, {"{data}"}, {"{horario}"} e {"{barbearia}"} para personalizar suas mensagens.
        </p>
        
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

        {/* Variáveis Disponíveis */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-blue-900 mb-2">🔧 Variáveis disponíveis:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-800 mb-3">
            <code className="bg-blue-100 px-2 py-1 rounded">{"{nome}"}</code>
            <code className="bg-blue-100 px-2 py-1 rounded">{"{data}"}</code>
            <code className="bg-blue-100 px-2 py-1 rounded">{"{horario}"}</code>
            <code className="bg-blue-100 px-2 py-1 rounded">{"{barbearia}"}</code>
          </div>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Exemplo de pré-visualização:</strong>
          </p>
          <div className="bg-white border border-blue-200 rounded p-2 text-xs text-gray-700">
            "Olá <strong>João Silva</strong>, você tem um agendamento às <strong>14:30</strong> no dia <strong>15/01/2024</strong> na <strong>Barbearia do João</strong>."
          </div>
        </div>

        {/* Regras e Informações */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-amber-900 mb-2">📌 Regras importantes:</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Mensagens são enviadas apenas para agendamentos confirmados</li>
            <li>• Botão "Cancelar" redireciona para [Meus Agendamentos]</li>
            <li>• Lembretes são enviados 1 hora antes do agendamento</li>
            <li>• Mensagens funcionam via e-mail e WhatsApp (se habilitados)</li>
            <li>• Configure as notificações na aba "Notificações" para ativar o envio</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};