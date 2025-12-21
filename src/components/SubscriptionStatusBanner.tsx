import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, AlertTriangle, Clock, XCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export const SubscriptionStatusBanner = () => {
  const { subscription, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading || !subscription) {
    return null;
  }

  const { plan, planLabel, status, endDate, daysUntilExpiry, hoursInGracePeriod } = subscription;

  // Don't show banner for active premium with more than 7 days
  if (status === 'active' && daysUntilExpiry && daysUntilExpiry > 7) {
    return null;
  }

  // Don't show for trial/pro unless limit reached
  if ((status === 'trial') && !subscription.isBlocked) {
    return null;
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'grace_period':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'expired':
      case 'inactive':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getAlertVariant = () => {
    switch (status) {
      case 'active':
        return daysUntilExpiry && daysUntilExpiry <= 3 ? 'destructive' : 'default';
      case 'grace_period':
        return 'destructive';
      case 'expired':
      case 'inactive':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusMessage = () => {
    if (status === 'active' && daysUntilExpiry !== null) {
      if (daysUntilExpiry <= 3) {
        return `Sua assinatura ${planLabel} vence em ${daysUntilExpiry} dia(s)! Renove agora para continuar usando.`;
      }
      return `Sua assinatura ${planLabel} vence em ${daysUntilExpiry} dias.`;
    }
    
    if (status === 'grace_period') {
      return `Sua assinatura venceu. Você tem ${hoursInGracePeriod} horas para renovar. Após esse prazo, o sistema será bloqueado.`;
    }
    
    if (status === 'expired') {
      return "Sua assinatura venceu e o sistema está bloqueado. Renove para continuar utilizando.";
    }

    if (status === 'inactive' || plan === 'free') {
      return "Você não possui uma assinatura ativa. Assine um plano para usar todas as funcionalidades.";
    }

    return "";
  };

  const message = getStatusMessage();
  if (!message) return null;

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Plano Atual: {planLabel}
            {status === 'active' && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500">
                Ativo
              </Badge>
            )}
            {status === 'grace_period' && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500">
                Período de Carência
              </Badge>
            )}
            {(status === 'expired' || status === 'inactive') && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500">
                {status === 'expired' ? 'Vencido' : 'Inativo'}
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>{message}</p>
              {endDate && status === 'active' && (
                <p className="text-sm text-muted-foreground">
                  Vence em: {format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
              <Button 
                size="sm" 
                onClick={() => navigate('/dashboard/planos')}
                variant={status === 'active' ? 'outline' : 'default'}
              >
                {status === 'active' ? 'Ver Planos' : 'Renovar Agora'}
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};
