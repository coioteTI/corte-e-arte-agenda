import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
  Section,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface AppointmentConfirmationEmailProps {
  clientName: string;
  companyName: string;
  serviceName: string;
  professionalName: string;
  appointmentDate: string;
  appointmentTime: string;
  totalPrice?: number;
  paymentMethod: string;
  companyPhone?: string;
  notes?: string;
}

export const AppointmentConfirmationEmail = ({
  clientName,
  companyName,
  serviceName,
  professionalName,
  appointmentDate,
  appointmentTime,
  totalPrice,
  paymentMethod,
  companyPhone,
  notes,
}: AppointmentConfirmationEmailProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'no_local': return 'Pagamento no local';
      default: return method;
    }
  };

  return (
    <Html>
      <Head />
      <Preview>Confirmação de agendamento - {companyName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Agendamento Confirmado! ✅</Heading>
          
          <Text style={text}>
            Olá <strong>{clientName}</strong>,
          </Text>
          
          <Text style={text}>
            Seu agendamento foi realizado com sucesso! Aqui estão os detalhes:
          </Text>

          <Section style={appointmentCard}>
            <Heading style={h2}>📋 Detalhes do Agendamento</Heading>
            
            <Text style={detail}>
              <strong>🏪 Estabelecimento:</strong> {companyName}
            </Text>
            
            <Text style={detail}>
              <strong>✂️ Serviço:</strong> {serviceName}
            </Text>
            
            <Text style={detail}>
              <strong>👨‍💼 Profissional:</strong> {professionalName}
            </Text>
            
            <Text style={detail}>
              <strong>📅 Data:</strong> {formatDate(appointmentDate)}
            </Text>
            
            <Text style={detail}>
              <strong>🕐 Horário:</strong> {appointmentTime}
            </Text>
            
            {totalPrice && (
              <Text style={detail}>
                <strong>💰 Valor:</strong> R$ {totalPrice.toFixed(2).replace('.', ',')}
              </Text>
            )}
            
            <Text style={detail}>
              <strong>💳 Forma de Pagamento:</strong> {getPaymentMethodText(paymentMethod)}
            </Text>
            
            {notes && (
              <Text style={detail}>
                <strong>📝 Observações:</strong> {notes}
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Section style={instructionsSection}>
            <Heading style={h3}>📱 Próximos Passos</Heading>
            
            <Text style={text}>
              • Seu agendamento está confirmado no sistema<br/>
              • Chegue com 10 minutos de antecedência<br/>
              • Em caso de imprevistos, entre em contato com antecedência<br/>
              {paymentMethod === 'no_local' && '• O pagamento será realizado no local do atendimento'}
              {paymentMethod === 'pix' && '• Se enviou comprovante PIX, aguarde a confirmação do pagamento'}
            </Text>

            {companyPhone && (
              <Text style={text}>
                <strong>📞 Contato:</strong> {companyPhone}
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Este é um email automático de confirmação do sistema <strong>Corte & Arte</strong>.<br/>
            Obrigado por escolher {companyName}!
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AppointmentConfirmationEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px 0',
  padding: '0',
};

const h3 = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '20px 0 10px 0',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

const detail = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const appointmentCard = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const instructionsSection = {
  margin: '20px 0',
};

const hr = {
  borderColor: '#e9ecef',
  margin: '20px 0',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '20px 0 0 0',
  textAlign: 'center' as const,
};