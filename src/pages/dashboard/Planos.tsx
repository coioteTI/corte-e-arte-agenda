import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, ArrowLeft, CheckCircle, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Planos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription, isLoading: subscriptionLoading } = useSubscription();

  const handleSubscribe = async () => {
    // Salvar dados no localStorage para o webhook usar
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem('user_email_for_kirvano', user.email || '');
      localStorage.setItem('selected_plan', 'premium_mensal');
    }
    
    const kirvanoUrl = 'https://pay.kirvano.com/9c9bce9b-547d-435e-91c9-0192f1a067e0';
    
    // Abrir o checkout do Kirvano em nova aba
    window.open(kirvanoUrl, '_blank');
    
    toast({
      title: "Redirecionamento para pagamento",
      description: "Você será redirecionado para o Kirvano para finalizar sua assinatura.",
    });
  };

  const isCurrentPlan = (planType: 'mensal' | 'anual') => {
    if (!subscription) return false;
    if (planType === 'mensal' && subscription.plan === 'premium_mensal') return true;
    if (planType === 'anual' && subscription.plan === 'premium_anual') return true;
    return false;
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
                      <Badge className="bg-blue-500 text-white">
                        Teste
                      </Badge>
                    )}
                    {subscription.status === 'grace_period' && (
                      <Badge className="bg-yellow-500 text-white">
                        <Clock className="h-3 w-3 mr-1" />
                        Carência
                      </Badge>
                    )}
                    {subscription.status === 'expired' && (
                      <Badge variant="destructive">
                        Vencido
                      </Badge>
                    )}
                    {subscription.status === 'inactive' && (
                      <Badge variant="secondary">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  
                  {/* Mostrar data de vencimento apenas para planos premium */}
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

                  {/* Mostrar uso de agendamentos apenas para planos trial */}
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
                      <p className="text-xs text-muted-foreground">
                        {getTrialMessage()}
                      </p>
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

        <div className="grid grid-cols-1 gap-6 max-w-lg mx-auto">
          {/* Mostrar card do plano anual apenas para quem já tem */}
          {isCurrentPlan('anual') && (
            <Card className="relative shadow-lg border-2 border-green-500">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Seu Plano Atual
                </Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-green-600" />
                  <CardTitle>Premium Anual</CardTitle>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-green-600">R$ 500</div>
                  <div className="text-sm text-muted-foreground">/ano</div>
                </div>
                <p className="text-sm text-muted-foreground">Plano anual vigente</p>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Seu plano anual está ativo. Após o vencimento, você poderá renovar com o plano mensal.
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Sistema completo de agendamentos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Gestão de clientes e serviços</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Relatórios e análises avançadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Suporte prioritário VIP</span>
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6 bg-green-600 hover:bg-green-700" 
                  disabled={true}
                >
                  Plano Atual
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Plano Premium Mensal - Disponível para todos */}
          <Card className={`relative shadow-lg ${isCurrentPlan('mensal') ? 'border-2 border-green-500' : 'border-primary'}`}>
            {isCurrentPlan('mensal') && subscription?.status === 'active' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Seu Plano Atual
                </Badge>
              </div>
            )}
            {!isCurrentPlan('mensal') && !isCurrentPlan('anual') && (
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
                <CardTitle>Premium Mensal</CardTitle>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-primary">R$ 59,90</div>
                <div className="text-sm text-muted-foreground line-through">R$ 79,90</div>
              </div>
              <p className="text-sm text-muted-foreground">primeiro mês com desconto</p>
              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full w-fit">
                Depois R$ 79,90/mês
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sistema completo de agendamentos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Gestão de clientes e serviços</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Controle de horários e profissionais</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Relatórios e análises avançadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Suporte prioritário</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6" 
                onClick={() => handleSubscribe()}
                disabled={isCurrentPlan('mensal') && subscription?.status === 'active'}
              >
                {isCurrentPlan('mensal') && subscription?.status === 'active' ? 'Plano Atual' : 
                 isCurrentPlan('mensal') ? 'Renovar Plano' : 'Assinar Agora'}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Flexibilidade para cancelar a qualquer momento
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Todos os preços são em Reais (BRL). Pagamento processado via Kirvano.
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
