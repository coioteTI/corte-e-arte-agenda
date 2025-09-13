import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useNotifications = (companyId: string) => {
  useEffect(() => {
    if (!companyId) return;

    // Configurar listener para novos agendamentos
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('Novo agendamento:', payload);
          
          if (payload.new.payment_status === 'awaiting_payment') {
            toast.success('🔔 Novo agendamento com comprovante PIX recebido!', {
              description: 'Verifique o histórico de pagamentos para confirmar.',
              duration: 5000,
            });
          } else if (payload.new.payment_status === 'pending') {
            toast.info('🔔 Novo agendamento para pagamento no local!', {
              description: 'Cliente escolheu pagar na hora do atendimento.',
              duration: 5000,
            });
          } else {
            toast.success('🔔 Novo agendamento confirmado!', {
              description: 'Um cliente fez um agendamento.',
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('Agendamento atualizado:', payload);
          
          // Notificar quando status de pagamento muda para pago
          if (payload.old.payment_status !== 'paid' && payload.new.payment_status === 'paid') {
            toast.success('✅ Pagamento confirmado!', {
              description: 'O status do agendamento foi atualizado.',
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      appointmentsChannel.unsubscribe();
    };
  }, [companyId]);

  // Função para enviar notificação ao cliente (simulação)
  const notifyClient = (message: string, clientName: string) => {
    console.log(`📱 Notificação para ${clientName}: ${message}`);
    
    // Aqui seria integrado com WhatsApp API, SMS, etc.
    toast.info('📱 Notificação enviada ao cliente', {
      description: `Mensagem: "${message}"`,
      duration: 3000,
    });
  };

  return { notifyClient };
};