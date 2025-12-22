import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useAdminPassword } from "@/hooks/useAdminPassword";
import { Bell, MessageSquare, User, Settings, Palette, Images, CreditCard, Lock, ShieldAlert, ArrowLeft, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { NotificacoesSection } from "@/components/configuracoes/NotificacoesSection";
import { PersonalizacaoSection } from "@/components/configuracoes/PersonalizacaoSection";
import { HorariosFuncionamentoSection } from "@/components/configuracoes/HorariosFuncionamentoSection";
import { SistemaSection } from "@/components/configuracoes/SistemaSection";
import { MensagensAutomaticasSection } from "@/components/configuracoes/MensagensAutomaticasSection";
import { MessageEditDialog } from "@/components/configuracoes/MessageEditDialog";
import { ContaEmpresaSection } from "@/components/configuracoes/ContaEmpresaSection";
import { ExcluirContaSection } from "@/components/configuracoes/ExcluirContaSection";
import { GaleriaSection } from "@/components/configuracoes/GaleriaSection";
import { PagamentoSection } from "@/components/configuracoes/PagamentoSection";
import { SenhaAdminSection } from "@/components/configuracoes/SenhaAdminSection";
import { ModulosSection } from "@/components/configuracoes/ModulosSection";

import {
  ConfiguracoesState,
  MensagensAutomaticasConfig,
  MessageType,
  CompanySettings,
  ContaEmpresaConfig,
  PagamentoConfig,
} from "@/types/configuracoes";

const Configuracoes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Admin password protection states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [validatingPassword, setValidatingPassword] = useState(false);
  const { hasAdminPassword, validateAdminPassword } = useAdminPassword();
  
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesState>({
    notificacoes: {
      whatsapp: false,
      lembretes: true,
      confirmacoes: true
    },
    personalizacao: {
      nomeBarbearia: "",
      corPrimaria: "#8B5CF6", // Mantido internamente mas removido da UI
      corSecundaria: "#ffffff",
      emailContato: "",
      telefone: "",
      instagram: ""
    },
    sistema: {
      agendamentoOnline: true,
      pagamentoOnline: false,
      relatoriosAvancados: true,
      integracaoWhatsApp: false
    },
    pagamento: {
      pixKey: "",
      pixQrCode: "",
      paymentMethods: ["no_local"],
      requiresPaymentConfirmation: false
    }
  });

  const [contaEmpresa, setContaEmpresa] = useState<ContaEmpresaConfig>({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    numero: "",
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
  
  // Ativar notificações para esta empresa
  useNotifications(companyId);

  // Check if admin password is configured and require authentication
  useEffect(() => {
    const checkAdminPassword = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: companies } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (companies) {
          const passwordExists = await hasAdminPassword(companies.id);
          setHasPassword(passwordExists);
          
          if (passwordExists) {
            setLoading(false);
          } else {
            setIsAuthenticated(true);
            loadCompanyData();
          }
        } else {
          // No company yet, allow access to create one
          setIsAuthenticated(true);
          loadCompanyData();
        }
      } catch (error) {
        console.error("Error checking admin password:", error);
        setIsAuthenticated(true);
        loadCompanyData();
      }
    };

    checkAdminPassword();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError("Digite a senha de administrador");
      return;
    }

    setValidatingPassword(true);
    setPasswordError("");

    // Get company ID first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!companies) return;

    const isValid = await validateAdminPassword(companies.id, passwordInput);
    
    if (isValid) {
      setIsAuthenticated(true);
      setLoading(true);
      loadCompanyData();
    } else {
      setPasswordError("Senha incorreta. Acesso negado.");
      setPasswordInput("");
    }
    
    setValidatingPassword(false);
  };

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
            logoUrl: company.logo_url || "",
            instagram: company.instagram || ""
          },
          sistema: {
            agendamentoOnline: s.online_booking_enabled,
            pagamentoOnline: s.online_payment_enabled,
            relatoriosAvancados: s.advanced_reports_enabled,
            integracaoWhatsApp: s.whatsapp_integration_enabled
          },
          pagamento: {
            pixKey: s.pix_key || "",
            pixQrCode: s.pix_qr_code || "",
            paymentMethods: s.payment_methods || ["no_local"],
            requiresPaymentConfirmation: s.requires_payment_confirmation || false
          }
        });
      }

      // Load company account data
      setContaEmpresa({
        nome: company.name,
        email: company.email,
        telefone: company.phone,
        endereco: company.address,
        numero: company.number,
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

  const handleInputChange = (categoria: string, campo: string, valor: string | string[] | boolean) => {
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
          whatsapp_notifications: configuracoes.notificacoes.whatsapp,
          reminders_enabled: configuracoes.notificacoes.lembretes,
          confirmations_enabled: configuracoes.notificacoes.confirmacoes,
          online_booking_enabled: configuracoes.sistema.agendamentoOnline,
          online_payment_enabled: configuracoes.sistema.pagamentoOnline,
          advanced_reports_enabled: configuracoes.sistema.relatoriosAvancados,
          whatsapp_integration_enabled: configuracoes.sistema.integracaoWhatsApp,
          primary_color: '#8B5CF6', // Cor fixa
          secondary_color: '#ffffff',
          pix_key: configuracoes.pagamento.pixKey || null,
          pix_qr_code: configuracoes.pagamento.pixQrCode || null,
          payment_methods: configuracoes.pagamento.paymentMethods,
          requires_payment_confirmation: configuracoes.pagamento.requiresPaymentConfirmation,
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
          instagram: configuracoes.personalizacao.instagram || null,
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
      console.log('Salvando dados da conta para empresa:', companyId);
      console.log('Dados a serem salvos:', contaEmpresa);
      
      const { data, error } = await supabase
        .from('companies')
        .update({
          name: contaEmpresa.nome,
          email: contaEmpresa.email,
          phone: contaEmpresa.telefone,
          address: contaEmpresa.endereco,
          number: contaEmpresa.numero,
          neighborhood: "", // Limpar campo neighborhood se não estiver sendo usado
          city: contaEmpresa.cidade,
          state: contaEmpresa.estado,
          zip_code: contaEmpresa.cep,
          logo_url: contaEmpresa.logoUrl,
        })
        .eq('id', companyId)
        .select();

      if (error) {
        console.error('Erro ao salvar dados da empresa:', error);
        throw error;
      }

      console.log('Dados salvos com sucesso:', data);

      toast({
        title: "✅ Dados salvos com sucesso!",
        description: "Os dados da sua empresa foram atualizados e já estão visíveis no sistema."
      });

      // Recarregar os dados para garantir que estão atualizados
      await loadCompanyData();
    } catch (error) {
      console.error('Error saving company data:', error);
      toast({
        title: "❌ Erro ao salvar dados",
        description: "Não foi possível salvar os dados da empresa. Tente novamente.",
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

  // Show password protection screen
  if (hasPassword && !isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                <Lock className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Acesso Protegido</CardTitle>
              <p className="text-muted-foreground mt-2">
                As Configurações estão protegidas por senha de administrador.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Digite a senha de administrador"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="text-center"
                    autoFocus
                  />
                  {passwordError && (
                    <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={validatingPassword}
                >
                  {validatingPassword ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Validando...
                    </div>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Acessar Configurações
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

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
      <div className="space-y-4">
        {/* Header melhorado */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-3 sm:p-4 border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Personalize e gerencie as configurações da sua barbearia
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-xs font-medium">Salvando...</span>
                </div>
              )}
              <Button 
                onClick={handleSalvarConfiguracoes}
                disabled={saving}
                size="sm"
                className="min-w-[100px] sm:min-w-[140px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200 font-medium text-xs sm:text-sm"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    ✅ Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs melhoradas */}
        <div className="bg-card rounded-lg border shadow-sm">
          <Tabs defaultValue="notificacoes" className="w-full">
            <div className="border-b bg-muted/30 rounded-t-lg">
              <TabsList className="w-full h-auto p-1 bg-transparent">
                <div className="grid w-full grid-cols-4 sm:grid-cols-7 gap-0.5 sm:gap-1">
                  <TabsTrigger 
                    value="notificacoes" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Notificações</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">Alertas</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="sistema" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Sistema</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">Funções</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="personalizacao" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Visual</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">Cores</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="pagamento" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Pagamento</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">PIX</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="galeria" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <Images className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Galeria</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">Fotos</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="modulos" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Módulos</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">Menu</div>
                    </div>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="conta" 
                    className="flex flex-col items-center gap-1 p-2 sm:p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200 hover:bg-background/50"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    <div className="text-center">
                      <div className="text-xs font-medium">Conta</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">Empresa</div>
                    </div>
                  </TabsTrigger>
                </div>
              </TabsList>
            </div>

            <div className="p-3 sm:p-4">
              <TabsContent value="notificacoes" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                      <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Notificações</h3>
                      <p className="text-xs text-muted-foreground">Configure alertas e lembretes</p>
                    </div>
                  </div>
                  <NotificacoesSection
                    configuracoes={configuracoes.notificacoes}
                    onSwitchChange={(campo, valor) => handleSwitchChange("notificacoes", campo, valor)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sistema" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
                      <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Sistema</h3>
                      <p className="text-xs text-muted-foreground">Funcionalidades do sistema</p>
                    </div>
                  </div>
                  <SistemaSection
                    configuracoes={configuracoes.sistema}
                    onSwitchChange={(campo, valor) => handleSwitchChange("sistema", campo, valor)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="personalizacao" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                      <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Personalização</h3>
                      <p className="text-xs text-muted-foreground">Aparência da sua barbearia</p>
                    </div>
                  </div>
                  <PersonalizacaoSection
                    configuracoes={configuracoes.personalizacao}
                    onInputChange={(campo, valor) => handleInputChange("personalizacao", campo, valor)}
                    companyId={companyId}
                  />
                  <HorariosFuncionamentoSection companyId={companyId} />
                </div>
              </TabsContent>

              <TabsContent value="pagamento" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                      <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Pagamento</h3>
                      <p className="text-xs text-muted-foreground">Configure formas de pagamento</p>
                    </div>
                  </div>
                  <PagamentoSection
                    configuracoes={configuracoes.pagamento}
                    onInputChange={(campo, valor) => handleInputChange("pagamento", campo, valor)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="galeria" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                      <Images className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Galeria de Fotos</h3>
                      <p className="text-xs text-muted-foreground">Mostre seus trabalhos</p>
                    </div>
                  </div>
                  <GaleriaSection companyId={companyId} />
                </div>
              </TabsContent>

              <TabsContent value="modulos" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-md">
                      <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Módulos do Sistema</h3>
                      <p className="text-xs text-muted-foreground">Ative ou desative funcionalidades</p>
                    </div>
                  </div>
                  {companyId && <ModulosSection companyId={companyId} />}
                </div>
              </TabsContent>

              <TabsContent value="conta" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
                      <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">Conta da Empresa</h3>
                      <p className="text-xs text-muted-foreground">Dados da sua empresa</p>
                    </div>
                  </div>
                <ContaEmpresaSection
                    contaEmpresa={contaEmpresa}
                    onInputChange={handleContaChange}
                    onSalvar={handleSalvarConta}
                    saving={saving}
                    companyId={companyId}
                  />
                  <SenhaAdminSection companyId={companyId} />
                  <ExcluirContaSection companyId={companyId} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

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