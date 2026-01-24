import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBranch } from '@/contexts/BranchContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  branch_id: string | null;
  appointment_id: string | null;
  company_id: string | null;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at: string | null;
  read_by: string | null;
  created_at: string;
}

interface UseNotificationsRealtimeOptions {
  soundEnabled?: boolean;
  onNewNotification?: (notification: Notification) => void;
}

// Audio for notification sound
let notificationAudio: HTMLAudioElement | null = null;

const playNotificationSound = () => {
  try {
    if (!notificationAudio) {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      notificationAudio.currentTime = 0;
      notificationAudio.play().catch(console.error);
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

export const useNotificationsRealtime = (options: UseNotificationsRealtimeOptions = {}) => {
  const { soundEnabled = true, onNewNotification } = options;
  const { currentBranchId, userRole } = useBranch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [soundEnabledSetting, setSoundEnabledSetting] = useState(soundEnabled);
  const lastNotificationId = useRef<string | null>(null);

  // Fetch company ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (company) {
        setCompanyId(company.id);
      }
    };

    fetchCompanyId();
  }, []);

  // Fetch sound setting
  useEffect(() => {
    const fetchSoundSetting = async () => {
      if (!companyId) return;

      const { data } = await supabase
        .from('company_settings')
        .select('notification_sound_enabled')
        .eq('company_id', companyId)
        .single();

      if (data) {
        setSoundEnabledSetting(data.notification_sound_enabled ?? true);
      }
    };

    fetchSoundSetting();
  }, [companyId]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter by branch if not CEO
      if (userRole !== 'ceo' && currentBranchId) {
        query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentBranchId, userRole]);

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchNotifications();
    }
  }, [companyId, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Check if this notification is for the current branch (or if user is CEO)
          const isForCurrentBranch = 
            userRole === 'ceo' || 
            !currentBranchId ||
            newNotification.branch_id === currentBranchId ||
            newNotification.branch_id === null;

          if (isForCurrentBranch && newNotification.id !== lastNotificationId.current) {
            lastNotificationId.current = newNotification.id;
            
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Play sound if enabled
            if (soundEnabledSetting) {
              playNotificationSound();
            }

            // Show toast
            toast.success(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
            });

            // Callback
            onNewNotification?.(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev => 
            prev.map(n => n.id === updated.id ? updated : n)
          );
          // Recalculate unread count
          setNotifications(current => {
            setUnreadCount(current.filter(n => !n.is_read).length);
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, currentBranchId, userRole, soundEnabledSetting, onNewNotification]);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        read_by: user?.id 
      })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!companyId) return;
    
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        read_by: user?.id 
      })
      .eq('company_id', companyId)
      .eq('is_read', false);

    // Filter by branch if not CEO
    if (userRole !== 'ceo' && currentBranchId) {
      query = query.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
    }

    const { error } = await query;

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, [companyId, currentBranchId, userRole]);

  // Toggle sound setting
  const toggleSound = useCallback(async () => {
    if (!companyId) return;

    const newValue = !soundEnabledSetting;
    setSoundEnabledSetting(newValue);

    await supabase
      .from('company_settings')
      .update({ notification_sound_enabled: newValue })
      .eq('company_id', companyId);

    toast.success(newValue ? 'Som de notificação ativado' : 'Som de notificação desativado');
  }, [companyId, soundEnabledSetting]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    soundEnabled: soundEnabledSetting,
    toggleSound
  };
};
