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
  isPremium: boolean;
}

// Planos que são considerados trial/gratuitos (com limite de agendamentos)
const TRIAL_PLANS = ['trial', 'pro', 'plano_teste', 'free'];

// Planos premium (sem limite de agendamentos)
const PREMIUM_PLANS = ['premium_mensal', 'premium_anual'];

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
      case 'pro':
      case 'plano_teste':
        return 'Período de Teste';
      case 'free':
        return 'Gratuito';
      default:
        return 'Nenhum';
    }
  };

  const isPremiumPlan = (plan: string): boolean => {
    return PREMIUM_PLANS.includes(plan);
  };

  const isTrialPlan = (plan: string): boolean => {
    return TRIAL_PLANS.includes(plan);
  };

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: companies, error } = await supabase
        .from('companies')
        .select('plan, subscription_start_date, subscription_end_date, subscription_status, trial_appointments_used, trial_appointments_limit, updated_at')
        .eq('user_id', user.id)
        .limit(1);

      const company = Array.isArray(companies) ? companies[0] : companies;
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
      const isPremium = isPremiumPlan(company.plan);

      // Determine subscription status based on plan type
      if (isPremium) {
        // PLANOS PREMIUM - Verificar datas de validade
        
        // Se não há data de fim mas o status é 'active', significa que foi ativado pelo webhook
        if (!endDate && company.subscription_status === 'active') {
          // Calcular baseado na data de atualização
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
          // Se tem plano premium mas sem data, verificar subscription_status
          if (company.subscription_status === 'active') {
            status = 'active';
          } else if (company.subscription_status === 'expired') {
            status = 'expired';
            isBlocked = true;
          } else {
            // Plano premium sem datas configuradas - considerar ativo por segurança
            // (pode ser uma configuração manual ou primeira ativação)
            status = 'active';
          }
        }
      } else if (isTrialPlan(company.plan)) {
        // PLANOS TRIAL/TESTE - Verificar limite de agendamentos
        status = 'trial';
        
        const appointmentsUsed = company.trial_appointments_used || 0;
        const appointmentsLimit = company.trial_appointments_limit || 50;
        
        if (appointmentsUsed >= appointmentsLimit) {
          status = 'expired';
          isBlocked = true;
        }
      } else {
        // Plano desconhecido ou 'free' - bloqueado
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
      } else if (isPremium && daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
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
        trialAppointmentsLimit: company.trial_appointments_limit || 50,
        isPremium
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
