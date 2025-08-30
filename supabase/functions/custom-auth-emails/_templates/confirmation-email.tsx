import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Section,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface ConfirmationEmailProps {
  supabase_url: string;
  token_hash: string;
  email_action_type: string;
  redirect_to: string;
  email: string;
}

export const ConfirmationEmail = ({
  supabase_url,
  token_hash,
  email_action_type,
  redirect_to,
  email,
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirme seu e-mail para acessar o Corte & Arte</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <div style={logoContainer}>
            <Text style={logo}>✂️ Corte & Arte</Text>
            <Text style={tagline}>Plataforma de Agendamento</Text>
          </div>
        </Section>
        
        <Heading style={h1}>🎉 Bem-vindo ao Corte & Arte!</Heading>
        
        <Text style={text}>
          <strong>Parabéns!</strong> Seu cadastro foi realizado com sucesso. 
        </Text>
        
        <Text style={text}>
          Para liberar o acesso completo à nossa plataforma e começar a gerenciar seus agendamentos, 
          confirme seu e-mail clicando no botão abaixo:
        </Text>

        <Section style={buttonContainer}>
          <Button
            pX={24}
            pY={16}
            style={button}
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          >
            ✅ Confirmar E-mail
          </Button>
        </Section>

        <Section style={benefitsSection}>
          <Text style={benefitsTitle}>O que você terá acesso:</Text>
          <Text style={benefitItem}>📅 Sistema completo de agendamentos</Text>
          <Text style={benefitItem}>👥 Gestão de clientes e profissionais</Text>
          <Text style={benefitItem}>📊 Relatórios e análises</Text>
          <Text style={benefitItem}>🎯 Planos premium disponíveis</Text>
        </Section>

        <Text style={text}>
          <strong>Link alternativo:</strong> Se o botão não funcionar, copie e cole este link:
        </Text>
        
        <Text style={linkText}>
          {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Após a confirmação, você será redirecionado para nossa plataforma.
        </Text>
        
        <Text style={footer}>
          <strong>Corte & Arte</strong> - Transformando o agendamento em barbearias e salões
        </Text>
        
        <Text style={disclaimerFooter}>
          Se você não se cadastrou, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const logoSection = {
  textAlign: 'center' as const,
  padding: '32px 0',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  margin: '20px 0',
};

const logoContainer = {
  display: 'inline-block',
};

const logo = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  textAlign: 'center' as const,
  margin: '0',
  letterSpacing: '1px',
};

const tagline = {
  fontSize: '14px',
  color: '#666',
  textAlign: 'center' as const,
  margin: '4px 0 0 0',
  fontStyle: 'italic',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '32px 0 24px 0',
  padding: '0',
  textAlign: 'center' as const,
  lineHeight: '1.2',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const benefitsSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #e0f2fe',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const benefitsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const benefitItem = {
  fontSize: '15px',
  color: '#374151',
  margin: '8px 0',
  lineHeight: '1.5',
};

const linkText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  wordBreak: 'break-all' as const,
  backgroundColor: '#f4f4f4',
  padding: '12px',
  borderRadius: '4px',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '8px 0',
  textAlign: 'center' as const,
  fontWeight: '500',
};

const disclaimerFooter = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '16px 0 4px 0',
  textAlign: 'center' as const,
  fontStyle: 'italic',
};

export default ConfirmationEmail;