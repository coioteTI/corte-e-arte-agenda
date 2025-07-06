import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Settings, MessageSquare, Bell } from "lucide-react";

const Configuracoes = () => {
  const [configuracoes, setConfiguracoes] = useState({
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

  const [mensagensAutomaticas, setMensagensAutomaticas] = useState({
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

  const messageTypes = [
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

  const temConfiguracoes = true; // Para demonstrar que há configurações

  if (!temConfiguracoes) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                Configure seu sistema aqui
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Personalize notificações, aparência e funcionalidades
              </p>
            </CardContent>
          </Card>
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

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receber confirmações e lembretes por email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={configuracoes.notificacoes.email}
                onCheckedChange={(checked) => 
                  handleSwitchChange("notificacoes", "email", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="whatsapp-notifications">Notificações WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar mensagens automáticas via WhatsApp
                </p>
              </div>
              <Switch
                id="whatsapp-notifications"
                checked={configuracoes.notificacoes.whatsapp}
                onCheckedChange={(checked) => 
                  handleSwitchChange("notificacoes", "whatsapp", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reminders">Lembretes Automáticos</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar lembretes 1 hora antes do agendamento
                </p>
              </div>
              <Switch
                id="reminders"
                checked={configuracoes.notificacoes.lembretes}
                onCheckedChange={(checked) => 
                  handleSwitchChange("notificacoes", "lembretes", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="confirmations">Confirmações de Agendamento</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar confirmação imediata após agendamento
                </p>
              </div>
              <Switch
                id="confirmations"
                checked={configuracoes.notificacoes.confirmacoes}
                onCheckedChange={(checked) => 
                  handleSwitchChange("notificacoes", "confirmacoes", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Personalização */}
        <Card>
          <CardHeader>
            <CardTitle>Personalização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome-barbearia">Nome da Barbearia</Label>
                <Input
                  id="nome-barbearia"
                  value={configuracoes.personalizacao.nomeBarbearia}
                  onChange={(e) => 
                    handleInputChange("personalizacao", "nomeBarbearia", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-contato">Email de Contato</Label>
                <Input
                  id="email-contato"
                  type="email"
                  value={configuracoes.personalizacao.emailContato}
                  onChange={(e) => 
                    handleInputChange("personalizacao", "emailContato", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={configuracoes.personalizacao.telefone}
                  onChange={(e) => 
                    handleInputChange("personalizacao", "telefone", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor-primaria">Cor Primária</Label>
                <div className="flex space-x-2">
                  <Input
                    id="cor-primaria"
                    type="color"
                    value={configuracoes.personalizacao.corPrimaria}
                    onChange={(e) => 
                      handleInputChange("personalizacao", "corPrimaria", e.target.value)
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    value={configuracoes.personalizacao.corPrimaria}
                    onChange={(e) => 
                      handleInputChange("personalizacao", "corPrimaria", e.target.value)
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload de Logo</Label>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <p className="text-muted-foreground">
                  Clique para fazer upload ou arraste sua logo aqui
                </p>
                <Button variant="outline" className="mt-2">
                  Escolher Arquivo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funcionalidades do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="agendamento-online">Agendamento Online</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que clientes agendem pela internet
                </p>
              </div>
              <Switch
                id="agendamento-online"
                checked={configuracoes.sistema.agendamentoOnline}
                onCheckedChange={(checked) => 
                  handleSwitchChange("sistema", "agendamentoOnline", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pagamento-online">Pagamento Online</Label>
                <p className="text-sm text-muted-foreground">
                  Aceitar pagamentos via cartão ou PIX
                </p>
              </div>
              <Switch
                id="pagamento-online"
                checked={configuracoes.sistema.pagamentoOnline}
                onCheckedChange={(checked) => 
                  handleSwitchChange("sistema", "pagamentoOnline", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="relatorios-avancados">Relatórios Avançados</Label>
                <p className="text-sm text-muted-foreground">
                  Gerar relatórios detalhados de performance
                </p>
              </div>
              <Switch
                id="relatorios-avancados"
                checked={configuracoes.sistema.relatoriosAvancados}
                onCheckedChange={(checked) => 
                  handleSwitchChange("sistema", "relatoriosAvancados", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="integracao-whatsapp">Integração WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Conectar com API do WhatsApp Business
                </p>
              </div>
              <Switch
                id="integracao-whatsapp"
                checked={configuracoes.sistema.integracaoWhatsApp}
                onCheckedChange={(checked) => 
                  handleSwitchChange("sistema", "integracaoWhatsApp", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Mensagens Personalizadas */}
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
                        onClick={() => handleEditMessage(messageType.key)}
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

            {/* Regras e Informações */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-blue-900 mb-2">📌 Regras importantes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Mensagens são enviadas apenas para agendamentos confirmados</li>
                <li>• Botão "Cancelar" redireciona para [Meus Agendamentos]</li>
                <li>• Lembretes são enviados 1 hora antes do agendamento</li>
                <li>• Use as variáveis disponíveis para personalizar as mensagens</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Dialog para editar mensagens */}
        <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Editar {messageTypes.find(t => t.key === editingMessageType)?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="message-content">Conteúdo da Mensagem</Label>
                <Textarea
                  id="message-content"
                  value={tempMessage}
                  onChange={(e) => setTempMessage(e.target.value)}
                  placeholder="Digite sua mensagem personalizada..."
                  className="min-h-32"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Variáveis disponíveis:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="bg-gray-200 px-2 py-1 rounded">{"{nome}"} - Nome do cliente</span>
                  <span className="bg-gray-200 px-2 py-1 rounded">{"{data}"} - Data do agendamento</span>
                  <span className="bg-gray-200 px-2 py-1 rounded">{"{horario}"} - Horário do agendamento</span>
                  <span className="bg-gray-200 px-2 py-1 rounded">{"{barbearia}"} - Nome da barbearia</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsMessageDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveMessage}>
                  Salvar Mensagem
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;