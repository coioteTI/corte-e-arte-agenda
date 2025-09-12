import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationManagerProps {
  companyId: string;
  onPaymentConfirmed?: (appointmentId: string) => void;
  onNewAppointment?: (appointment: any) => void;
}

export const NotificationManager = ({ 
  companyId, 
  onPaymentConfirmed, 
  onNewAppointment 
}: NotificationManagerProps) => {
  
  useEffect(() => {
    if (!companyId) return;

    // Escutar mudanças nos agendamentos
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              handleNewAppointment(payload.new as any);
              break;
            case 'UPDATE':
              handleAppointmentUpdate(payload.old as any, payload.new as any);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
    };
  }, [companyId]);

  const handleNewAppointment = (appointment: any) => {
    const hasProof = appointment.pix_payment_proof;
    const paymentMethod = appointment.payment_method;
    
    if (paymentMethod === 'pix' && hasProof) {
      toast.success(`🔔 Novo agendamento com comprovante PIX recebido!`, {
        description: `Cliente enviou comprovante de pagamento. Verifique o histórico de pagamentos.`,
        duration: 5000
      });
    } else {
      toast.success(`🔔 Novo agendamento recebido!`, {
        description: `Agendamento ${paymentMethod === 'pix' ? 'PIX' : 'no local'} confirmado.`,
        duration: 5000
      });
    }
    
    onNewAppointment?.(appointment);
  };

  const handleAppointmentUpdate = (oldAppointment: any, newAppointment: any) => {
    // Detectar mudança no status de pagamento
    if (oldAppointment.payment_status !== newAppointment.payment_status) {
      if (newAppointment.payment_status === 'paid') {
        toast.success(`💰 Pagamento confirmado!`, {
          description: `Agendamento marcado como pago.`,
          duration: 4000
        });
        onPaymentConfirmed?.(newAppointment.id);
      }
    }

    // Detectar envio de comprovante
    if (!oldAppointment.pix_payment_proof && newAppointment.pix_payment_proof) {
      toast.info(`📄 Comprovante PIX recebido!`, {
        description: `Cliente enviou comprovante. Verifique e confirme o pagamento.`,
        duration: 5000
      });
    }
  };

  return null; // Este componente não renderiza nada
};

// Hook para notificações do cliente
export const useClientNotifications = (clientId?: string) => {
  useEffect(() => {
    if (!clientId) return;

    const appointmentsChannel = supabase
      .channel('client-appointments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          const appointment = payload.new as any;
          
          if (appointment.payment_status === 'paid' && payload.old.payment_status !== 'paid') {
            toast.success(`✅ Pagamento confirmado!`, {
              description: `Seu agendamento foi confirmado pela empresa.`,
              duration: 5000
            });
          }
          
          if (appointment.status === 'confirmed' && payload.old.status !== 'confirmed') {
            toast.success(`🎉 Agendamento confirmado!`, {
              description: `Seu horário está garantido!`,
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
    };
  }, [clientId]);
};

// Mensagens automáticas padrão
export const getAutomaticMessages = () => ({
  paymentReceived: "Recebemos seu comprovante PIX! Seu agendamento será confirmado em breve após a verificação do pagamento.",
  paymentConfirmed: "Pagamento confirmado! Seu agendamento está garantido para {data} às {horario}. Aguardamos você!",
  appointmentScheduled: "Agendamento realizado com sucesso! Data: {data} às {horario}. Forma de pagamento: {pagamento}.",
  reminder: "Lembrete: você tem um agendamento amanhã às {horario}. Confirme sua presença!",
  cancellation: "Seu agendamento do dia {data} às {horario} foi cancelado. Para reagendar, entre em contato."
});

// Função para enviar notificações automáticas
export const sendAutomaticNotification = async (
  companyId: string,
  type: keyof ReturnType<typeof getAutomaticMessages>,
  appointmentData: any,
  customMessage?: string
) => {
  try {
    const messages = getAutomaticMessages();
    let message = customMessage || messages[type];
    
    // Substituir variáveis na mensagem
    if (appointmentData) {
      message = message
        .replace('{data}', appointmentData.appointment_date)
        .replace('{horario}', appointmentData.appointment_time)
        .replace('{pagamento}', appointmentData.payment_method === 'pix' ? 'PIX' : 'No Local')
        .replace('{nome}', appointmentData.client_name || 'Cliente');
    }

    // Aqui você pode implementar o envio via WhatsApp, email, etc.
    console.log(`Sending notification (${type}):`, message);
    
    // Por enquanto, apenas mostrar toast de confirmação
    toast.success("Notificação enviada ao cliente");
    
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    toast.error("Erro ao enviar notificação");
  }
};