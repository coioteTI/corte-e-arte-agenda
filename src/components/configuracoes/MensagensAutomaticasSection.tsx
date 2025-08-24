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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            🔧 <span>Variáveis Disponíveis para Personalização</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white border border-blue-200 rounded p-2 text-center">
              <code className="text-blue-800 font-medium text-sm">{"{nome}"}</code>
              <p className="text-xs text-blue-600 mt-1">Nome do cliente</p>
            </div>
            <div className="bg-white border border-blue-200 rounded p-2 text-center">
              <code className="text-blue-800 font-medium text-sm">{"{data}"}</code>
              <p className="text-xs text-blue-600 mt-1">Data do agendamento</p>
            </div>
            <div className="bg-white border border-blue-200 rounded p-2 text-center">
              <code className="text-blue-800 font-medium text-sm">{"{horario}"}</code>
              <p className="text-xs text-blue-600 mt-1">Horário marcado</p>
            </div>
            <div className="bg-white border border-blue-200 rounded p-2 text-center">
              <code className="text-blue-800 font-medium text-sm">{"{barbearia}"}</code>
              <p className="text-xs text-blue-600 mt-1">Nome da barbearia</p>
            </div>
          </div>
          <div className="bg-white border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-700 mb-2">
              <strong>💡 Exemplo de mensagem personalizada:</strong>
            </p>
            <div className="text-sm text-gray-700 italic bg-gray-50 p-2 rounded">
              "Olá <strong className="text-blue-600">João Silva</strong>, você tem um agendamento às <strong className="text-blue-600">14:30</strong> no dia <strong className="text-blue-600">15/01/2024</strong> na <strong className="text-blue-600">Barbearia do João</strong>."
            </div>
          </div>
        </div>

        {/* Regras Importantes - Destaque especial */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6 mt-6">
          <h4 className="font-bold text-amber-900 mb-4 text-lg flex items-center gap-2">
            📌 <span>Regras Importantes do Sistema</span>
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-amber-900">Mensagens são enviadas apenas para agendamentos confirmados</p>
                <p className="text-sm text-amber-700 mt-1">O sistema só dispara notificações após a confirmação do agendamento</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-amber-900">Botão "Cancelar" redireciona para [Meus Agendamentos]</p>
                <p className="text-sm text-amber-700 mt-1">Facilita o cancelamento pelo próprio cliente</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-amber-900">Lembretes são enviados 1 hora antes do agendamento</p>
                <p className="text-sm text-amber-700 mt-1">Timing automático para reduzir faltas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded border border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-amber-900">Mensagens funcionam via e-mail e WhatsApp (se habilitados)</p>
                <p className="text-sm text-amber-700 mt-1">Configure as notificações na aba "Notificações" para ativar o envio</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};