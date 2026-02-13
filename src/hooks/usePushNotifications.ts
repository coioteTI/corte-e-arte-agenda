import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// This should match the VAPID_PUBLIC_KEY secret
const PUBLIC_VAPID_KEY = 'BJtFxkX7W5n2iUCSP6SYQwU8G6G0UHmRmqmRp2hO_qN4MjH8jXYc9z6vLmJjN2oWG2RV8ej6b7q6q2p7G7xP9qL';

export const usePushNotifications = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check for existing subscription
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSub = await (registration as any).pushManager?.getSubscription();
          setSubscription(existingSub);
        } catch (error) {
          console.error('Error checking existing subscription:', error);
        }
      }
    };

    checkSupport();
  }, []);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get company for this user
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (company) {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('is_read', false);

        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Listen for new notifications in real-time
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      const channel = supabase
        .channel('push-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `company_id=eq.${company.id}`
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      // Initial fetch
      fetchUnreadCount();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [fetchUnreadCount]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Notificações push não são suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Permissão para notificações negada');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  };

  const subscribe = async (): Promise<PushSubscription | null> => {
    setIsLoading(true);
    
    try {
      if (!isSupported) {
        throw new Error('Push notifications não são suportadas');
      }

      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return null;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push
      const pushSubscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      setSubscription(pushSubscription);

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const subscriptionJson = pushSubscription.toJSON();
      
      // Upsert subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Notificações ativadas com sucesso!');
      return pushSubscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Erro ao ativar notificações push');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);

        // Remove from database
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
      console.error('Error unsubscribing from push:', error);
      toast.error('Erro ao desativar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id
        })
        .eq('id', notificationId);

      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (companyId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: user.id
        })
        .eq('company_id', companyId)
        .eq('is_read', false);

      setUnreadCount(0);
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    isLoading,
    unreadCount,
    subscribe,
    unsubscribe,
    requestPermission,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  };
};

// Helper function to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
