import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Clock, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationSettingsProps {
  isClient?: boolean;
}

export const NotificationSettings = ({ isClient = false }: NotificationSettingsProps) => {
  const { 
    isSupported, 
    permission, 
    subscription, 
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
        return { text: 'Permitidas', color: 'text-green-600' };
      case 'denied':
        return { text: 'Negadas', color: 'text-red-600' };
      default:
        return { text: 'Não solicitadas', color: 'text-yellow-600' };
    }
  };

  const permissionStatus = getPermissionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status das notificações */}
        <div className="flex items-center justify-between p-4 bg-muted/10 rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Status das Notificações</p>
              <p className={`text-sm ${permissionStatus.color}`}>
                {permissionStatus.text}
              </p>
            </div>
          </div>
          
          {isSupported ? (
            <Button
              onClick={handleToggleNotifications}
              variant={subscription ? "destructive" : "default"}
              size="sm"
            >
              {subscription ? (
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
            <p className="text-sm text-muted-foreground">
              Não suportado neste navegador
            </p>
          )}
        </div>

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
                      Confirmações de agendamento
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
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">📱 Receba notificações sobre:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Lembretes 1 hora antes do seu agendamento</li>
              <li>Confirmações de novos agendamentos</li>
              <li>Promoções e ofertas especiais</li>
              <li>Atualizações importantes do estabelecimento</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};