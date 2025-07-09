import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Bell, MessageSquare, User, Settings, Palette, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { NotificacoesSection } from "@/components/configuracoes/NotificacoesSection";
import { PersonalizacaoSection } from "@/components/configuracoes/PersonalizacaoSection";
import { SistemaSection } from "@/components/configuracoes/SistemaSection";
import { MensagensAutomaticasSection } from "@/components/configuracoes/MensagensAutomaticasSection";
import { MessageEditDialog } from "@/components/configuracoes/MessageEditDialog";
import { ContaEmpresaSection } from "@/components/configuracoes/ContaEmpresaSection";
import { EditarDadosClienteSection } from "@/components/configuracoes/EditarDadosClienteSection";
import { ExcluirContaSection } from "@/components/configuracoes/ExcluirContaSection";

import {
  ConfiguracoesState,
  MensagensAutomaticasConfig,
  MessageType,
  CompanySettings,
  ContaEmpresaConfig,
} from "@/types/configuracoes";

const Configuracoes = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesState>({
    notificacoes: {
      email: true,
      whatsapp: false,
      lembretes: true,
      confirmacoes: true
    },
    personalizacao: {
      nomeBarbearia: "",
      corPrimaria: "#8B5CF6", // Mantido internamente mas removido da UI
      corSecundaria: "#ffffff",
      emailContato: "",
      telefone: ""
    },
    sistema: {
      agendamentoOnline: true,
      pagamentoOnline: false,
      relatoriosAvancados: true,
      integracaoWhatsApp: false
    }
  });

  const [contaEmpresa, setContaEmpresa] = useState<ContaEmpresaConfig>({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    logoUrl: ""
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

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User data:', user);
      
      if (userError) {
        console.error('Error getting user:', userError);
        toast({
          title: "Erro de autenticação",
          description: "Não foi possível obter dados do usuário. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      if (!user) {
        console.log('No user found');
        toast({
          title: "Usuário não encontrado",
          description: "Faça login para acessar as configurações.",
          variant: "destructive",
        });
        return;
      }

      // Get company data
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      console.log('Companies data:', companies);
      console.log('Company error:', companyError);

      if (companyError) {
        console.error('Error fetching company:', companyError);
        toast({
          title: "Erro ao buscar empresa",
          description: "Não foi possível carregar os dados da empresa.",
          variant: "destructive",
        });
        return;
      }

      let company: any;

      if (!companies || companies.length === 0) {
        console.log('No company found for user, creating one...');
        
        // Create a default company for the user with minimal data
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            name: '',
            email: user.email || '',
            phone: '',
            address: '',
            city: '',
            state: '',
            neighborhood: '',
            number: '',
            zip_code: ''
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating company:', createError);
          toast({
            title: "Erro ao criar empresa",
            description: "Não foi possível criar uma empresa para este usuário.",
            variant: "destructive",
          });
          return;
        }

        console.log('Company created:', newCompany);
        setCompanyId(newCompany.id);
        company = newCompany;
        
        toast({
          title: "Empresa criada",
          description: "Uma nova empresa foi criada para você! Complete seus dados nas configurações.",
        });
      } else {
        company = companies[0];
        console.log('Setting company ID:', company.id);
        setCompanyId(company.id);
      }
      
      // Load company settings
      const { data: settings, error: settingsError } = await supabase
        .rpc('get_or_create_company_settings', { company_uuid: company.id });

      console.log('Settings data:', settings);
      console.log('Settings error:', settingsError);

      if (settingsError) {
        console.error('Error loading settings:', settingsError);
        // Continue even if settings fail, we still have company ID
      }

      if (settings && settings[0]) {
        const s = settings[0];
        setCompanySettings(s);
        
        setConfiguracoes({
          notificacoes: {
            email: s.email_notifications,
            whatsapp: s.whatsapp_notifications,
            lembretes: s.reminders_enabled,
            confirmacoes: s.confirmations_enabled
          },
          personalizacao: {
            nomeBarbearia: company.name,
            corPrimaria: s.primary_color,
            corSecundaria: s.secondary_color,
            emailContato: company.email,
            telefone: company.phone,
            logoUrl: company.logo_url || ""
          },
          sistema: {
            agendamentoOnline: s.online_booking_enabled,
            pagamentoOnline: s.online_payment_enabled,
            relatoriosAvancados: s.advanced_reports_enabled,
            integracaoWhatsApp: s.whatsapp_integration_enabled
          }
        });
      }

      // Load company account data
      setContaEmpresa({
        nome: company.name,
        email: company.email,
        telefone: company.phone,
        endereco: company.address,
        cidade: company.city,
        estado: company.state,
        cep: company.zip_code,
        logoUrl: company.logo_url || ""
      });

      // Load notification templates
      const { data: templates, error: templatesError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('company_id', company.id);

      if (templatesError) {
        console.error('Error loading templates:', templatesError);
      }

      if (templates && templates.length > 0) {
        const templatesMap: Record<string, string> = {};
        templates.forEach(template => {
          templatesMap[template.template_type] = template.message_template;
        });
        
        setMensagensAutomaticas(prev => ({
          ...prev,
          ...templatesMap
        }));
      }

    } catch (error) {
      console.error('Error loading company data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleContaChange = (campo: string, valor: string) => {
    setContaEmpresa(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleSalvarConfiguracoes = async () => {
    // Tentar recarregar o companyId se não estiver presente
    if (!companyId) {
      console.log('Company ID not found, attempting to reload...');
      await loadCompanyData();
      
      // Se ainda não houver companyId após recarregar, mostrar erro
      if (!companyId) {
        toast({
          title: "Erro",
          description: "ID da empresa não encontrado. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setSaving(true);
    try {
      console.log('Salvando configurações para empresa:', companyId);
      console.log('Dados a serem salvos:', configuracoes);
      
      // Update company settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('company_settings')
        .upsert({
          company_id: companyId,
          email_notifications: configuracoes.notificacoes.email,
          whatsapp_notifications: configuracoes.notificacoes.whatsapp,
          reminders_enabled: configuracoes.notificacoes.lembretes,
          confirmations_enabled: configuracoes.notificacoes.confirmacoes,
          online_booking_enabled: configuracoes.sistema.agendamentoOnline,
          online_payment_enabled: configuracoes.sistema.pagamentoOnline,
          advanced_reports_enabled: configuracoes.sistema.relatoriosAvancados,
          whatsapp_integration_enabled: configuracoes.sistema.integracaoWhatsApp,
          primary_color: '#8B5CF6', // Cor fixa
          secondary_color: '#ffffff',
        }, {
          onConflict: 'company_id'
        })
        .select();

      if (settingsError) {
        console.error('Erro ao salvar configurações:', settingsError);
        throw settingsError;
      }
      
      console.log('Settings salvos:', settingsData);

      // Update company basic data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .update({
          name: configuracoes.personalizacao.nomeBarbearia,
          email: configuracoes.personalizacao.emailContato,
          phone: configuracoes.personalizacao.telefone,
        })
        .eq('id', companyId)
        .select();

      if (companyError) {
        console.error('Erro ao atualizar empresa:', companyError);
        throw companyError;
      }
      
      console.log('Company data atualizada:', companyData);

      console.log('Configurações salvas com sucesso');
      
      toast({
        title: "✅ Configurações salvas com sucesso!",
        description: "Todas as suas preferências foram atualizadas e estão ativas.",
      });
    } catch (error: any) {
      console.error('Error saving configurations:', error);
      toast({
        title: "❌ Erro ao salvar configurações",
        description: error.message || "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarConta = async () => {
    if (!companyId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: contaEmpresa.nome,
          email: contaEmpresa.email,
          phone: contaEmpresa.telefone,
          address: contaEmpresa.endereco,
          city: contaEmpresa.cidade,
          state: contaEmpresa.estado,
          zip_code: contaEmpresa.cep,
          logo_url: contaEmpresa.logoUrl,
        })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Dados salvos",
        description: "Os dados da sua empresa foram atualizados com sucesso!"
      });
    } catch (error) {
      console.error('Error saving company data:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados da empresa.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditMessage = (tipo: string) => {
    setEditingMessageType(tipo);
    setTempMessage(mensagensAutomaticas[tipo as keyof typeof mensagensAutomaticas]);
    setIsMessageDialogOpen(true);
  };

  const handleSaveMessage = async () => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('notification_templates')
        .upsert({
          company_id: companyId,
          template_type: editingMessageType,
          message_template: tempMessage,
          is_active: true
        });

      if (error) throw error;

      setMensagensAutomaticas(prev => ({
        ...prev,
        [editingMessageType]: tempMessage
      }));
      
      setIsMessageDialogOpen(false);
      toast({
        title: "Mensagem atualizada",
        description: "Sua mensagem personalizada foi salva com sucesso!"
      });
    } catch (error) {
      console.error('Error saving message template:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a mensagem.",
        variant: "destructive",
      });
    }
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <div className="text-center p-12">
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between sticky top-0 bg-background border-b pb-4 z-10">
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <div className="flex items-center gap-3">
            {saving && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span>Salvando...</span>
              </div>
            )}
            <Button 
              onClick={handleSalvarConfiguracoes}
              disabled={saving}
              size="lg"
              className="min-w-[180px] hover:scale-105 transition-transform duration-200"
            >
              {saving ? "Salvando..." : "✅ Salvar Configurações"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="notificacoes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="sistema" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="personalizacao" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Personalização
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="conta" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Conta
            </TabsTrigger>
            <TabsTrigger value="excluir" className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Excluir
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notificacoes">
            <NotificacoesSection
              configuracoes={configuracoes.notificacoes}
              onSwitchChange={(campo, valor) => handleSwitchChange("notificacoes", campo, valor)}
            />
          </TabsContent>

          <TabsContent value="sistema">
            <SistemaSection
              configuracoes={configuracoes.sistema}
              onSwitchChange={(campo, valor) => handleSwitchChange("sistema", campo, valor)}
            />
          </TabsContent>

          <TabsContent value="personalizacao">
            <PersonalizacaoSection
              configuracoes={configuracoes.personalizacao}
              onInputChange={(campo, valor) => handleInputChange("personalizacao", campo, valor)}
              companyId={companyId}
            />
          </TabsContent>

          <TabsContent value="mensagens">
            <MensagensAutomaticasSection
              mensagensAutomaticas={mensagensAutomaticas}
              onEditMessage={handleEditMessage}
            />
          </TabsContent>

          <TabsContent value="conta">
            <div className="space-y-6">
              <ContaEmpresaSection
                contaEmpresa={contaEmpresa}
                onInputChange={handleContaChange}
                onSalvar={handleSalvarConta}
                saving={saving}
              />
              <EditarDadosClienteSection />
            </div>
          </TabsContent>

          <TabsContent value="excluir">
            <ExcluirContaSection companyId={companyId} />
          </TabsContent>
        </Tabs>

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