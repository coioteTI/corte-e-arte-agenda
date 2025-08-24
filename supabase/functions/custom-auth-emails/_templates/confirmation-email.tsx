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
          <Text style={logo}>✂️ Corte & Arte</Text>
        </Section>
        
        <Heading style={h1}>Bem-vindo ao Corte & Arte!</Heading>
        
        <Text style={text}>
          Olá! Obrigado por se cadastrar na nossa plataforma de agendamento de barbearias e salões.
        </Text>
        
        <Text style={text}>
          Para começar a usar sua conta, você precisa confirmar seu endereço de e-mail clicando no botão abaixo:
        </Text>

        <Section style={buttonContainer}>
          <Button
            pX={20}
            pY={12}
            style={button}
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          >
            Confirmar E-mail
          </Button>
        </Section>

        <Text style={text}>
          Ou copie e cole este link no seu navegador:
        </Text>
        
        <Text style={linkText}>
          {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Se você não criou uma conta no Corte & Arte, pode ignorar este e-mail com segurança.
        </Text>
        
        <Text style={footer}>
          <strong>Corte & Arte</strong> - Sua plataforma de agendamento para barbearias e salões
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
  padding: '20px 0',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#000000',
  textAlign: 'center' as const,
  margin: '0',
};

const h1 = {
  color: '#000000',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  maxWidth: '200px',
  margin: '0 auto',
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
  color: '#8898aa',
  fontSize: '12px',
  margin: '4px 0',
  textAlign: 'center' as const,
};

export default ConfirmationEmail;