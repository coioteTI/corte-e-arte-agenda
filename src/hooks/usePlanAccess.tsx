import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const usePlanAccess = (requiredPlan?: 'premium_mensal' | 'premium_anual') => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>('nenhum');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: company } = await supabase
        .from('companies')
        .select('plan, updated_at, trial_appointments_used, trial_appointments_limit')
        .eq('user_id', user.id)
        .single();

      if (!company) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      const userPlan = company.plan || 'trial';
      setCurrentPlan(userPlan);

      // Se está em trial, verificar limite de agendamentos
      if (userPlan === 'trial') {
        const appointmentsUsed = company.trial_appointments_used || 0;
        const appointmentsLimit = company.trial_appointments_limit || 20;
        
        if (appointmentsUsed >= appointmentsLimit) {
          setHasAccess(false);
          toast({
            title: "Limite de agendamentos atingido",
            description: `Você atingiu o limite de ${appointmentsLimit} agendamentos do período trial. Assine um plano para continuar.`,
            variant: "destructive"
          });
          return;
        }
        
        // Ainda tem agendamentos disponíveis no trial
        setHasAccess(true);
        return;
      }

      // Verificar se o plano premium está ativo e não expirou
      if (userPlan === 'premium_mensal' || userPlan === 'premium_anual') {
        let planExpired = false;
        if (company.updated_at) {
          const lastUpdate = new Date(company.updated_at);
          const now = new Date();
          const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          const maxDays = userPlan === 'premium_anual' ? 365 : 30;
          planExpired = daysSinceUpdate > maxDays;
        }

        if (planExpired) {
          setHasAccess(false);
          toast({
            title: "Plano expirado",
            description: "Seu plano expirou. Renove para continuar usando.",
            variant: "destructive"
          });
          return;
        }

        // Plano premium ativo
        setHasAccess(true);
        return;
      }

      // Qualquer outro plano, bloquear
      setHasAccess(false);
    } catch (error) {
      console.error('Erro ao verificar acesso ao plano:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToPlans = () => {
    navigate('/planos');
  };

  return {
    hasAccess,
    isLoading,
    currentPlan,
    redirectToPlans,
    checkAccess
  };
};