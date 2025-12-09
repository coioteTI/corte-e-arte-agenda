import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard } from 'lucide-react';

export const PlanStatusChecker = () => {
  const [planStatus, setPlanStatus] = useState<{
    hasActivePlan: boolean;
    plan: string;
    daysUntilExpiry?: number;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkPlanStatus();
  }, []);

  const checkPlanStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('plan, updated_at')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      // Trial é um plano ativo válido enquanto não atingir o limite
      const isPremiumPlan = company.plan === 'premium_mensal' || company.plan === 'premium_anual';
      const isTrialPlan = company.plan === 'trial';
      const hasActivePlan = isPremiumPlan || isTrialPlan;
      
      // Calcular dias até expiração (apenas para planos premium)
      let daysUntilExpiry;
      if (isPremiumPlan && company.updated_at) {
        const lastUpdate = new Date(company.updated_at);
        const now = new Date();
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        daysUntilExpiry = company.plan === 'premium_anual' ? 365 - daysSinceUpdate : 30 - daysSinceUpdate;
      }

      setPlanStatus({
        hasActivePlan,
        plan: company.plan || 'nenhum',
        daysUntilExpiry
      });

      // Mostrar avisos baseados no status do plano (NÃO para trial ativo)
      if (!hasActivePlan) {
        toast({
          title: "Plano inativo",
          description: "Escolha um plano para acessar todas as funcionalidades.",
          variant: "destructive"
        });
      } else if (isPremiumPlan && daysUntilExpiry && daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        toast({
          title: "Plano expirando em breve",
          description: `Seu plano expira em ${daysUntilExpiry} dias. Renove para continuar usando.`,
          variant: "destructive"
        });
      } else if (daysUntilExpiry && daysUntilExpiry <= 0) {
        toast({
          title: "Plano expirado",
          description: "Seu plano expirou. Renove para continuar usando todas as funcionalidades.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status do plano:', error);
    }
  };

  const handleUpgrade = () => {
    navigate('/planos');
  };

  if (!planStatus) return null;

  // Não mostrar alerta para plano trial ativo
  if (planStatus.plan === 'trial') return null;

  // Mostrar alerta se plano está inativo ou próximo do vencimento (apenas para premium)
  if (!planStatus.hasActivePlan || (planStatus.daysUntilExpiry && planStatus.daysUntilExpiry <= 7)) {
    return (
      <div className="mb-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {!planStatus.hasActivePlan 
                ? "Você precisa de um plano ativo para usar todas as funcionalidades."
                : `Seu plano expira em ${planStatus.daysUntilExpiry} dias.`
              }
            </span>
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="ml-4"
            >
              <CreditCard className="h-3 w-3 mr-1" />
              {!planStatus.hasActivePlan ? "Escolher Plano" : "Renovar"}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
};