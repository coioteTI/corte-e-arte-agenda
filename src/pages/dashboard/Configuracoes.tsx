import { useState } from "react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Bell, MessageSquare } from "lucide-react";

import { NotificacoesSection } from "@/components/configuracoes/NotificacoesSection";
import { PersonalizacaoSection } from "@/components/configuracoes/PersonalizacaoSection";
import { SistemaSection } from "@/components/configuracoes/SistemaSection";
import { MensagensAutomaticasSection } from "@/components/configuracoes/MensagensAutomaticasSection";
import { MessageEditDialog } from "@/components/configuracoes/MessageEditDialog";

import {
  ConfiguracoesState,
  MensagensAutomaticasConfig,
  MessageType,
} from "@/types/configuracoes";

const Configuracoes = () => {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesState>({
    notificacoes: {
      email: true,
      whatsapp: false,
      lembretes: true,
      confirmacoes: true
    },
    personalizacao: {
      nomeBarbearia: "Barbearia do João",
      corPrimaria: "#000000",
      corSecundaria: "#ffffff",
      emailContato: "contato@barbearia.com",
      telefone: "(11) 99999-9999"
    },
    sistema: {
      agendamentoOnline: true,
      pagamentoOnline: false,
      relatoriosAvancados: true,
      integracaoWhatsApp: false
    }
  });

  const [mensagensAutomaticas, setMensagensAutomaticas] = useState<MensagensAutomaticasConfig>({
    lembrete: "Olá {nome}, você tem um agendamento às {horario} no dia {data}. Se irá comparecer, clique em OK. Caso contrário, clique em Cancelar.",
    confirmacao: "Agendamento confirmado! {nome}, seu horário está marcado para {data} às {horario}. Aguardamos você!",
    boasVindas: "Bem-vindo(a) à {barbearia}! Agradecemos sua preferência. Em caso de dúvidas, entre em contato conosco.",
    cancelamento: "Seu agendamento do dia {data} às {horario} foi cancelado. Para reagendar, entre em contato ou acesse nossa plataforma."
  });

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [editingMessageType, setEditingMessageType] = useState<string>('');
  const [tempMessage, setTempMessage] = useState('');

  const { toast } = useToast();

  const handleSwitchChange = (categoria: string, campo: string, valor: boolean) => {
    setConfiguracoes(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria as keyof typeof prev],
        [campo]: valor
      }
    }));
  };

  const handleInputChange = (categoria: string, campo: string, valor: string) => {
    setConfiguracoes(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria as keyof typeof prev],
        [campo]: valor
      }
    }));
  };

  const handleSalvarConfiguracoes = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas configurações foram atualizadas com sucesso!"
    });
  };

  const handleEditMessage = (tipo: string) => {
    setEditingMessageType(tipo);
    setTempMessage(mensagensAutomaticas[tipo as keyof typeof mensagensAutomaticas]);
    setIsMessageDialogOpen(true);
  };

  const handleSaveMessage = () => {
    setMensagensAutomaticas(prev => ({
      ...prev,
      [editingMessageType]: tempMessage
    }));
    setIsMessageDialogOpen(false);
    toast({
      title: "Mensagem atualizada",
      description: "Sua mensagem personalizada foi salva com sucesso!"
    });
  };

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

  const temConfiguracoes = true;

  if (!temConfiguracoes) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <div className="text-center p-12">
            <p className="text-muted-foreground text-lg">
              Configure seu sistema aqui
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Personalize notificações, aparência e funcionalidades
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <Button onClick={handleSalvarConfiguracoes}>
            Salvar Configurações
          </Button>
        </div>

        <NotificacoesSection
          configuracoes={configuracoes.notificacoes}
          onSwitchChange={(campo, valor) => handleSwitchChange("notificacoes", campo, valor)}
        />

        <PersonalizacaoSection
          configuracoes={configuracoes.personalizacao}
          onInputChange={(campo, valor) => handleInputChange("personalizacao", campo, valor)}
        />

        <SistemaSection
          configuracoes={configuracoes.sistema}
          onSwitchChange={(campo, valor) => handleSwitchChange("sistema", campo, valor)}
        />

        <MensagensAutomaticasSection
          mensagensAutomaticas={mensagensAutomaticas}
          onEditMessage={handleEditMessage}
        />

        <MessageEditDialog
          isOpen={isMessageDialogOpen}
          onOpenChange={setIsMessageDialogOpen}
          messageTypes={messageTypes}
          editingMessageType={editingMessageType}
          tempMessage={tempMessage}
          onTempMessageChange={setTempMessage}
          onSaveMessage={handleSaveMessage}
        />
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;