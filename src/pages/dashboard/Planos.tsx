import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, ArrowLeft, CheckCircle, Clock, Calendar } from "lucide-react";
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

  const handleSubscribe = async (planType: 'mensal' | 'anual' | 'teste') => {
    // Salvar dados no localStorage para o webhook usar
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem('user_email_for_kirvano', user.email || '');
      localStorage.setItem('selected_plan', planType === 'teste' ? 'plano_teste' : planType === 'mensal' ? 'premium_mensal' : 'premium_anual');
    }
    
    const kirvanoUrls = {
      mensal: 'https://pay.kirvano.com/9c9bce9b-547d-435e-91c9-0192f1a067e0',
      anual: 'https://pay.kirvano.com/854ff17c-c700-4c7b-a085-bc216cb822d1',
      teste: 'https://pay.kiwify.com.br/9oNOaqB'
    };
    
    // Abrir o checkout do Kirvano em nova aba
    window.open(kirvanoUrls[planType], '_blank');
    
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
          <Card className="mb-6 border-primary/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-primary" />
                Seu Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{subscription.planLabel}</span>
                    {subscription.status === 'active' && (
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
                  </div>
                  
                  {subscription.endDate && subscription.status === 'active' && (
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
                    <p className="text-sm text-muted-foreground">
                      Agendamentos utilizados: {subscription.trialAppointmentsUsed} de {subscription.trialAppointmentsLimit}
                    </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* Plano Premium Mensal */}
          <Card className={`relative shadow-lg ${isCurrentPlan('mensal') ? 'border-2 border-green-500' : 'border-primary'}`}>
            {isCurrentPlan('mensal') && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Seu Plano Atual
                </Badge>
              </div>
            )}
            {!isCurrentPlan('mensal') && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Crown className="h-3 w-3 mr-1" />
                  Popular
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
                  <span className="text-sm">Tudo do plano gratuito</span>
                </li>
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
                onClick={() => handleSubscribe('mensal')}
                disabled={isCurrentPlan('mensal') && subscription?.status === 'active'}
              >
                {isCurrentPlan('mensal') && subscription?.status === 'active' ? 'Plano Atual' : 
                 isCurrentPlan('mensal') ? 'Renovar Plano' : 'Assinar Mensalmente'}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Flexibilidade para cancelar
              </p>
            </CardContent>
          </Card>

          {/* Plano Premium Anual */}
          <Card className={`relative shadow-lg ${isCurrentPlan('anual') ? 'border-2 border-green-500' : 'border-green-500'}`}>
            {isCurrentPlan('anual') && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Seu Plano Atual
                </Badge>
              </div>
            )}
            {!isCurrentPlan('anual') && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Melhor Valor
                </Badge>
              </div>
            )}
            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-green-600" />
                <CardTitle>Premium Anual</CardTitle>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-green-600">R$ 500</div>
                <div className="text-sm text-muted-foreground line-through">R$ 958,80</div>
              </div>
              <p className="text-sm text-muted-foreground">pagamento à vista</p>
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full w-fit">
                Economize R$ 458,80 por ano
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Tudo do plano mensal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">2 meses gratuitos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Suporte prioritário VIP</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Recursos beta em primeiro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Consultoria personalizada</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6 bg-green-600 hover:bg-green-700" 
                onClick={() => handleSubscribe('anual')}
                disabled={isCurrentPlan('anual') && subscription?.status === 'active'}
              >
                {isCurrentPlan('anual') && subscription?.status === 'active' ? 'Plano Atual' : 
                 isCurrentPlan('anual') ? 'Renovar Plano' : 'Assinar Anualmente'}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Melhor custo-benefício
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
