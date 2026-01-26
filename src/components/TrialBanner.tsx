import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Sparkles } from "lucide-react";

export const TrialBanner = () => {
  const [trialInfo, setTrialInfo] = useState<{
    used: number;
    limit: number;
    plan: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTrialInfo();
  }, []);

  const loadTrialInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('plan, trial_appointments_used, trial_appointments_limit')
        .eq('user_id', user.id)
        .single();

      if (company && company.plan === 'trial') {
        setTrialInfo({
          used: company.trial_appointments_used || 0,
          limit: company.trial_appointments_limit || 50,
          plan: company.plan
        });
      }
    } catch (error) {
      console.error('Erro ao carregar informações do trial:', error);
    }
  };

  if (!trialInfo || trialInfo.plan !== 'trial') return null;

  const remaining = trialInfo.limit - trialInfo.used;
  const percentage = (trialInfo.used / trialInfo.limit) * 100;
  const isLimitClose = remaining <= 10;
  const isLimitReached = remaining <= 0;

  return (
    <Alert variant={isLimitReached ? "destructive" : isLimitClose ? "default" : "default"} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-bold">⚠️ Período Trial - Limite de 50 Agendamentos</span>
        <span className="text-sm font-normal">
          {trialInfo.used} / {trialInfo.limit} usados
        </span>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                isLimitReached ? 'bg-destructive' : 
                isLimitClose ? 'bg-yellow-500' : 
                'bg-primary'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          
          {isLimitReached ? (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold">
                Você atingiu o limite de 50 agendamentos gratuitos. O sistema está bloqueado até assinar um plano premium.
              </p>
              <Button size="sm" onClick={() => navigate('/planos')}>
                Ver Planos Premium
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm">
                Restam {remaining} agendamento{remaining !== 1 ? 's' : ''} gratuito{remaining !== 1 ? 's' : ''}. 
                {isLimitClose && ' Após o limite, o sistema será bloqueado até assinar um plano.'}
              </p>
              {isLimitClose && (
                <Button size="sm" variant="outline" onClick={() => navigate('/planos')}>
                  Ver Planos
                </Button>
              )}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
