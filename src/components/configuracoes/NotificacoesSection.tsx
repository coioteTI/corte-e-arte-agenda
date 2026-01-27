import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { NotificacoesConfig } from "@/types/configuracoes";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificacoesSectionProps {
  configuracoes: NotificacoesConfig;
  onSwitchChange: (campo: string, valor: boolean) => void;
}

export const NotificacoesSection = ({ configuracoes, onSwitchChange }: NotificacoesSectionProps) => {
  const { 
    isSupported, 
    permission, 
    subscription, 
    isLoading,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  const handleTogglePush = async () => {
    if (subscription) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Ativadas', color: 'text-green-600' };
      case 'denied':
        return { text: 'Bloqueadas pelo navegador', color: 'text-red-600' };
      default:
        return { text: 'Não configuradas', color: 'text-yellow-600' };
    }
  };

  const permissionStatus = getPermissionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Push Notifications Section */}
        <div className="p-4 bg-muted/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-medium">Notificações Push (Mobile)</Label>
                <p className={`text-sm ${permissionStatus.color}`}>
                  {permissionStatus.text}
                </p>
              </div>
            </div>
            
            {isSupported ? (
              <Button
                onClick={handleTogglePush}
                variant={subscription ? "destructive" : "default"}
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Carregando..."
                ) : subscription ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Não suportado
              </span>
            )}
          </div>
          
          {!subscription && isSupported && (
            <p className="text-xs text-muted-foreground">
              Ative para receber alertas de novos agendamentos no seu celular, 
              mesmo com o app fechado.
            </p>
          )}
          
          {subscription && (
            <p className="text-xs text-green-600">
              ✓ Você receberá notificações de novos agendamentos
            </p>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="whatsapp-notifications">Notificações WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              Enviar mensagens automáticas via WhatsApp
            </p>
          </div>
          <Switch
            id="whatsapp-notifications"
            checked={configuracoes.whatsapp}
            onCheckedChange={(checked) => onSwitchChange("whatsapp", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reminders">Lembretes Automáticos</Label>
            <p className="text-sm text-muted-foreground">
              Enviar lembretes 1 hora antes do agendamento
            </p>
          </div>
          <Switch
            id="reminders"
            checked={configuracoes.lembretes}
            onCheckedChange={(checked) => onSwitchChange("lembretes", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="confirmations">Confirmações de Agendamento</Label>
            <p className="text-sm text-muted-foreground">
              Enviar confirmação imediata após agendamento
            </p>
          </div>
          <Switch
            id="confirmations"
            checked={configuracoes.confirmacoes}
            onCheckedChange={(checked) => onSwitchChange("confirmacoes", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
