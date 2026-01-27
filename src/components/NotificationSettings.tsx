import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Clock, Tag, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  isClient?: boolean;
}

export const NotificationSettings = ({ isClient = false }: NotificationSettingsProps) => {
  const { 
    isSupported, 
    permission, 
    subscription, 
    isLoading,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  
  const [settings, setSettings] = useState({
    appointments: true,
    promotions: true,
    reminders: true,
  });

  const handleToggleNotifications = async () => {
    if (subscription) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { 
          text: 'Notificações ativadas', 
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          icon: Check
        };
      case 'denied':
        return { 
          text: 'Bloqueadas pelo navegador', 
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          icon: AlertCircle
        };
      default:
        return { 
          text: 'Não configuradas', 
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          icon: Bell
        };
    }
  };

  const permissionStatus = getPermissionStatus();
  const StatusIcon = permissionStatus.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas de novos agendamentos diretamente no seu celular
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status das notificações */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg transition-colors",
          permissionStatus.bgColor
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              subscription ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
            )}>
              <StatusIcon className={cn("h-5 w-5", permissionStatus.color)} />
            </div>
            <div>
              <p className="font-medium">Status das Notificações</p>
              <p className={`text-sm ${permissionStatus.color}`}>
                {subscription ? 'Ativas - você receberá alertas' : permissionStatus.text}
              </p>
            </div>
          </div>
          
          {isSupported ? (
            <Button
              onClick={handleToggleNotifications}
              variant={subscription ? "outline" : "default"}
              size="sm"
              disabled={isLoading}
              className={cn(
                subscription && "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              )}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processando...
                </>
              ) : subscription ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Ativar Notificações
                </>
              )}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Não suportado neste navegador
            </p>
          )}
        </div>

        {/* Badge information */}
        {subscription && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              📱 Recursos ativos
            </h4>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Notificações mesmo com app fechado
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Badge no ícone do app (contador de não lidas)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Central de notificações no app
              </li>
            </ul>
          </div>
        )}

        {/* Configurações de tipos de notificação */}
        {subscription && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Tipos de Notificação</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="reminders" className="text-sm">
                      Lembretes de agendamento
                    </Label>
                  </div>
                  <Switch
                    id="reminders"
                    checked={settings.reminders}
                    onCheckedChange={(checked) => updateSetting('reminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="appointments" className="text-sm">
                      Novos agendamentos
                    </Label>
                  </div>
                  <Switch
                    id="appointments"
                    checked={settings.appointments}
                    onCheckedChange={(checked) => updateSetting('appointments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="promotions" className="text-sm">
                      Promoções e ofertas especiais
                    </Label>
                  </div>
                  <Switch
                    id="promotions"
                    checked={settings.promotions}
                    onCheckedChange={(checked) => updateSetting('promotions', checked)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Informações sobre notificações */}
        {!subscription && isSupported && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="font-medium">📱 Ao ativar, você receberá:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Alertas instantâneos de novos agendamentos</li>
              <li>Lembretes antes dos horários marcados</li>
              <li>Atualizações de cancelamentos/alterações</li>
              <li>Notificações mesmo com o app fechado</li>
            </ul>
            <p className="text-muted-foreground/80 pt-2">
              O ícone do app mostrará um número indicando quantas notificações não lidas você tem.
            </p>
          </div>
        )}

        {permission === 'denied' && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <p className="font-medium">⚠️ Notificações bloqueadas</p>
            <p className="mt-1">
              Você bloqueou as notificações no navegador. Para ativar, acesse as 
              configurações do navegador e permita notificações para este site.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
