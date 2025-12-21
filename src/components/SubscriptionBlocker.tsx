import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, AlertTriangle, Clock } from "lucide-react";
import logo from "@/assets/logo.png";

interface SubscriptionBlockerProps {
  children: React.ReactNode;
}

export const SubscriptionBlocker = ({ children }: SubscriptionBlockerProps) => {
  const { subscription, isLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  // Pages that should always be accessible (even when blocked)
  const allowedPaths = [
    '/dashboard/planos',
    '/dashboard/configuracoes',
    '/pagamento-sucesso',
    '/payment-success'
  ];

  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando assinatura...</p>
        </div>
      </div>
    );
  }

  // If no subscription data, allow access (might be an error, let other guards handle it)
  if (!subscription) {
    return <>{children}</>;
  }

  // If user is blocked and not on an allowed path
  if (subscription.isBlocked && !isAllowedPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img src={logo} alt="Logo" className="h-16 w-auto" />
            </div>
            <div className="flex justify-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Lock className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Sistema Bloqueado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              {subscription.status === 'grace_period' ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-yellow-600">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Período de Carência</span>
                  </div>
                  <p className="text-muted-foreground">
                    Sua assinatura venceu. Você tem até 24 horas para renovar.
                    Após esse prazo, o sistema será completamente bloqueado.
                  </p>
                  {subscription.hoursInGracePeriod !== null && (
                    <p className="text-sm font-medium text-red-600">
                      Tempo restante: {subscription.hoursInGracePeriod} hora(s)
                    </p>
                  )}
                </>
              ) : subscription.status === 'expired' ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Assinatura Vencida</span>
                  </div>
                  <p className="text-muted-foreground">
                    Sua assinatura expirou e o acesso ao sistema foi bloqueado.
                    Renove agora para continuar utilizando todas as funcionalidades.
                  </p>
                </>
              ) : subscription.plan === 'trial' || subscription.plan === 'pro' ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Limite de Agendamentos Atingido</span>
                  </div>
                  <p className="text-muted-foreground">
                    Você utilizou {subscription.trialAppointmentsUsed} de {subscription.trialAppointmentsLimit} agendamentos do período de teste.
                    Assine um plano premium para continuar.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Crown className="h-5 w-5" />
                    <span className="font-medium">Sem Assinatura Ativa</span>
                  </div>
                  <p className="text-muted-foreground">
                    Você não possui uma assinatura ativa.
                    Escolha um plano para acessar o sistema.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/dashboard/planos')}
              >
                <Crown className="h-4 w-4 mr-2" />
                Escolher Plano
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/')}
              >
                Voltar ao Início
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Precisa de ajuda? Entre em contato com nosso suporte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is not blocked or is on an allowed path
  return <>{children}</>;
};
