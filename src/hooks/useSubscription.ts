import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionInfo {
  plan: string;
  planLabel: string;
  status: 'active' | 'grace_period' | 'expired' | 'inactive' | 'trial';
  startDate: Date | null;
  endDate: Date | null;
  daysUntilExpiry: number | null;
  hoursInGracePeriod: number | null;
  isBlocked: boolean;
  trialAppointmentsUsed: number;
  trialAppointmentsLimit: number;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSubscription();
  }, []);

  const getPlanLabel = (plan: string): string => {
    switch (plan) {
      case 'premium_mensal':
        return 'Premium Mensal';
      case 'premium_anual':
        return 'Premium Anual';
      case 'trial':
        return 'Período de Teste';
      case 'pro':
        return 'Pro (Padrão)';
      case 'free':
        return 'Gratuito';
      default:
        return 'Nenhum';
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: company, error } = await supabase
        .from('companies')
        .select('plan, subscription_start_date, subscription_end_date, subscription_status, trial_appointments_used, trial_appointments_limit, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error || !company) {
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      const now = new Date();
      let status: SubscriptionInfo['status'] = 'inactive';
      let daysUntilExpiry: number | null = null;
      let hoursInGracePeriod: number | null = null;
      let isBlocked = false;
      let endDate = company.subscription_end_date ? new Date(company.subscription_end_date) : null;

      // Determine subscription status
      if (company.plan === 'trial' || company.plan === 'pro') {
        status = 'trial';
        
        // Check if trial limit reached
        const appointmentsUsed = company.trial_appointments_used || 0;
        const appointmentsLimit = company.trial_appointments_limit || 50;
        
        if (appointmentsUsed >= appointmentsLimit) {
          status = 'expired';
          isBlocked = true;
        }
      } else if (company.plan === 'premium_mensal' || company.plan === 'premium_anual') {
        // Calculate end date if not set but we have updated_at
        if (!endDate && company.updated_at) {
          const lastUpdate = new Date(company.updated_at);
          const maxDays = company.plan === 'premium_anual' ? 365 : 30;
          endDate = new Date(lastUpdate.getTime() + (maxDays * 24 * 60 * 60 * 1000));
        }

        if (endDate) {
          const timeDiff = endDate.getTime() - now.getTime();
          daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry > 0) {
            status = 'active';
          } else if (daysUntilExpiry >= -1) {
            // Within 24 hours grace period
            status = 'grace_period';
            hoursInGracePeriod = Math.max(0, 24 + (daysUntilExpiry * 24));
          } else {
            status = 'expired';
            isBlocked = true;
          }
        } else {
          // No end date, check subscription_status field
          status = (company.subscription_status as SubscriptionInfo['status']) || 'active';
          if (status === 'expired') {
            isBlocked = true;
          }
        }
      } else if (company.plan === 'free') {
        status = 'inactive';
        isBlocked = true;
      }

      // Show appropriate toasts
      if (status === 'grace_period') {
        toast({
          title: "⚠️ Assinatura venceu",
          description: `Você tem ${hoursInGracePeriod} horas para renovar. Após esse prazo, o sistema será bloqueado.`,
          variant: "destructive"
        });
      } else if (daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
        toast({
          title: "⏰ Renovação próxima",
          description: `Sua assinatura vence em ${daysUntilExpiry} dia(s). Renove para continuar usando o sistema.`,
        });
      }

      setSubscription({
        plan: company.plan,
        planLabel: getPlanLabel(company.plan),
        status,
        startDate: company.subscription_start_date ? new Date(company.subscription_start_date) : null,
        endDate,
        daysUntilExpiry,
        hoursInGracePeriod,
        isBlocked,
        trialAppointmentsUsed: company.trial_appointments_used || 0,
        trialAppointmentsLimit: company.trial_appointments_limit || 50
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToPlans = () => {
    navigate('/dashboard/planos');
  };

  return {
    subscription,
    isLoading,
    redirectToPlans,
    refreshSubscription: checkSubscription
  };
};
