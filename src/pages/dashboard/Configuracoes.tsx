import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

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
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;