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
        .select('plan, updated_at')
        .eq('user_id', user.id)
        .single();

      if (!company) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      const userPlan = company.plan || 'nenhum';
      setCurrentPlan(userPlan);

      // Verificar se o plano está ativo
      const hasActivePlan = userPlan !== 'nenhum';
      
      // Verificar se o plano não expirou
      let planExpired = false;
      if (hasActivePlan && company.updated_at) {
        const lastUpdate = new Date(company.updated_at);
        const now = new Date();
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        const maxDays = userPlan === 'premium_anual' ? 365 : 30;
        planExpired = daysSinceUpdate > maxDays;
      }

      // Se tem plano ativo e não expirou
      if (hasActivePlan && !planExpired) {
        // Se não requer plano específico ou tem o plano necessário
        if (!requiredPlan || userPlan === requiredPlan || 
            (requiredPlan === 'premium_mensal' && userPlan === 'premium_anual')) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          toast({
            title: "Acesso restrito",
            description: "Esta funcionalidade requer um plano premium.",
            variant: "destructive"
          });
        }
      } else {
        setHasAccess(false);
        if (planExpired) {
          toast({
            title: "Plano expirado",
            description: "Seu plano expirou. Renove para continuar usando.",
            variant: "destructive"
          });
        }
      }
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