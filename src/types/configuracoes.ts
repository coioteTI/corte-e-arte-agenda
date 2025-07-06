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

export interface MessageType {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}