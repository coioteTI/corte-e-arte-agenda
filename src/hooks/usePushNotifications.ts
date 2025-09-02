import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const publicVapidKey = 'BJtFxkX7W5n2iUCSP6SYQwU8G6G0UHmRmqmRp2hO_qN4MjH8jXYc9z6vLmJjN2oWG2RV8ej6b7q6q2p7G7xP9qL';

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Notificações push não são suportadas neste navegador');
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);

    if (permission !== 'granted') {
      toast.error('Permissão para notificações negada');
      return false;
    }

    return true;
  };

  const subscribe = async () => {
    try {
      if (!isSupported) {
        throw new Error('Push messaging não é suportado');
      }

      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      // Registrar service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();

      // Criar subscription
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      setSubscription(pushSubscription);

      // Salvar subscription no banco
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const subscriptionJson = pushSubscription.toJSON();
      
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh!,
        auth: subscriptionJson.keys!.auth!,
      });

      if (error) throw error;

      toast.success('Notificações ativadas com sucesso!');
      return pushSubscription;
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      toast.error('Erro ao ativar notificações push');
      return null;
    }
  };

  const unsubscribe = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);

        // Remover do banco
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }

        toast.success('Notificações desativadas');
      }
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
      toast.error('Erro ao desativar notificações');
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}