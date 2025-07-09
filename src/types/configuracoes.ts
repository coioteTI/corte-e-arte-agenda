export interface NotificacoesConfig {
  email: boolean;
  whatsapp: boolean;
  lembretes: boolean;
  confirmacoes: boolean;
}

export interface PersonalizacaoConfig {
  nomeBarbearia: string;
  corPrimaria: string;
  corSecundaria: string;
  emailContato: string;
  telefone: string;
  logoUrl?: string;
}

export interface SistemaConfig {
  agendamentoOnline: boolean;
  pagamentoOnline: boolean;
  relatoriosAvancados: boolean;
  integracaoWhatsApp: boolean;
}

export interface MensagensAutomaticasConfig {
  lembrete: string;
  confirmacao: string;
  boasVindas: string;
  cancelamento: string;
}

export interface ConfiguracoesState {
  notificacoes: NotificacoesConfig;
  personalizacao: PersonalizacaoConfig;
  sistema: SistemaConfig;
}

export interface CompanySettings {
  id?: string;
  company_id: string;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  reminders_enabled: boolean;
  confirmations_enabled: boolean;
  online_booking_enabled: boolean;
  online_payment_enabled: boolean;
  advanced_reports_enabled: boolean;
  whatsapp_integration_enabled: boolean;
  primary_color: string;
  secondary_color: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContaEmpresaConfig {
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  logoUrl?: string;
}

export interface MessageType {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}