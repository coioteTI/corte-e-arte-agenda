import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, ArrowLeft, CheckCircle, Clock, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanSetting {
  id: string;
  plan_key: string;
  plan_name: string;
  price: number;
  description: string | null;
  features: string[];
  payment_link: string | null;
  is_active: boolean;
  sort_order: number;
  billing_period: string;
}

const Planos = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription, isLoading: subscriptionLoading } = useSubscription();
  const [platformPlans, setPlatformPlans] = useState<PlanSetting[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    loadPlatformPlans();
  }, []);

  const loadPlatformPlans = async () => {
    setPlansLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_plan_settings')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setPlatformPlans(data);
      }
    } catch (e) {
      console.error('Erro ao carregar planos:', e);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleSubscribe = async (plan: PlanSetting) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem('user_email_for_kirvano', user.email || '');
      localStorage.setItem('selected_plan', plan.plan_key);
    }

    if (plan.payment_link) {
      window.open(plan.payment_link, '_blank');
      toast({
        title: "Redirecionamento para pagamento",
        description: `Você será redirecionado para finalizar sua assinatura do ${plan.plan_name}.`,
      });
    } else {
      toast({
        title: "Link indisponível",
        description: "O link de pagamento ainda não foi configurado. Entre em contato com o suporte.",
        variant: "destructive",
      });
    }
  };

  const isCurrentPlan = (planKey: string) => {
    if (!subscription) return false;
    return subscription.plan === planKey;
  };

  const getTrialMessage = () => {
    if (!subscription || !subscription.status) return null;
    if (subscription.status === 'trial') {
      const remaining = subscription.trialAppointmentsLimit - subscription.trialAppointmentsUsed;
      return `Você está no período de teste com ${remaining} agendamentos restantes de ${subscription.trialAppointmentsLimit}.`;
    }
    return null;
  };

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Current Plan Status */}
        {subscription && !subscriptionLoading && (
          <Card className={`mb-6 ${subscription.isPremium ? 'border-green-500/50' : 'border-primary/50'}`}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className={`h-5 w-5 ${subscription.isPremium ? 'text-green-500' : 'text-primary'}`} />
                Seu Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{subscription.planLabel}</span>
                    {subscription.isPremium && subscription.status === 'active' && (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                    {subscription.status === 'trial' && (
                      <Badge className="bg-blue-500 text-white">Teste</Badge>
                    )}
                    {subscription.status === 'grace_period' && (
                      <Badge className="bg-yellow-500 text-white">
                        <Clock className="h-3 w-3 mr-1" />
                        Carência
                      </Badge>
                    )}
                    {subscription.status === 'expired' && (
                      <Badge variant="destructive">Vencido</Badge>
                    )}
                    {subscription.status === 'inactive' && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>

                  {subscription.isPremium && subscription.endDate && subscription.status === 'active' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vence em: {format(subscription.endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      {subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 7 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-500">
                          {subscription.daysUntilExpiry} dia(s) restante(s)
                        </Badge>
                      )}
                    </div>
                  )}

                  {subscription.status === 'trial' && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Agendamentos utilizados: <strong>{subscription.trialAppointmentsUsed}</strong> de <strong>{subscription.trialAppointmentsLimit}</strong>
                      </p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((subscription.trialAppointmentsUsed / subscription.trialAppointmentsLimit) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{getTrialMessage()}</p>
                    </div>
                  )}

                  {subscription.status === 'grace_period' && (
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ Sua assinatura venceu. Você tem {subscription.hoursInGracePeriod} hora(s) para renovar.
                    </p>
                  )}
                  {subscription.status === 'expired' && (
                    <p className="text-sm text-red-600 font-medium">
                      ❌ Sua assinatura expirou. Renove agora para continuar usando o sistema.
                    </p>
                  )}
                  {subscription.status === 'inactive' && (
                    <p className="text-sm text-muted-foreground">
                      Assine um plano para desbloquear todos os recursos do sistema.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Escolha seu Plano</h1>
          <p className="text-sm md:text-base text-muted-foreground px-4">
            Desbloqueie todo o potencial da sua barbearia com nossos Planos Premium
          </p>
        </div>

        {/* Plans from database */}
        {plansLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : platformPlans.length > 0 ? (
          <div className={`grid grid-cols-1 gap-6 ${platformPlans.length > 1 ? 'md:grid-cols-2' : 'max-w-lg mx-auto'}`}>
            {platformPlans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.plan_key);
              const isActive = isCurrent && subscription?.status === 'active';

              return (
                <Card
                  key={plan.id}
                  className={`relative shadow-lg ${isActive ? 'border-2 border-green-500' : 'border-primary'}`}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Seu Plano Atual
                      </Badge>
                    </div>
                  )}
                  {!isCurrent && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pt-8">
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      <CardTitle>{plan.plan_name}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-primary">
                        R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                      </div>
                      <div className="text-sm text-muted-foreground">/{plan.billing_period}</div>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </CardHeader>

                  <CardContent>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan)}
                      disabled={isActive}
                    >
                      {isActive
                        ? 'Plano Atual'
                        : isCurrent
                        ? 'Renovar Plano'
                        : 'Assinar Agora'}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Flexibilidade para cancelar a qualquer momento
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Fallback: plano padrão se não houver configuração */
          <div className="max-w-lg mx-auto">
            <Card className="relative shadow-lg border-primary">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Crown className="h-3 w-3 mr-1" />
                  Recomendado
                </Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle>Premium Mensal</CardTitle>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-primary">R$ 79,90</div>
                  <div className="text-sm text-muted-foreground">/mês</div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['Sistema completo de agendamentos', 'Gestão de clientes e serviços', 'Controle de horários e profissionais', 'Relatórios e análises avançadas', 'Suporte prioritário'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" onClick={() => window.open('https://pay.kirvano.com/9c9bce9b-547d-435e-91c9-0192f1a067e0', '_blank')}>
                  Assinar Agora
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Todos os preços são em Reais (BRL). Pagamento processado com segurança.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Cancele a qualquer momento. Sem taxas de cancelamento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planos;
