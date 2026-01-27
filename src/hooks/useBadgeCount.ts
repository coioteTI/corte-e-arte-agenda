import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseBadgeCountOptions {
  companyId?: string;
  branchId?: string;
}

export const useBadgeCount = ({ companyId, branchId }: UseBadgeCountOptions = {}) => {
  const [count, setCount] = useState(0);

  const updateBadge = useCallback((newCount: number) => {
    setCount(newCount);
    
    // Update the app badge if supported
    if ('setAppBadge' in navigator) {
      if (newCount > 0) {
        (navigator as any).setAppBadge(newCount).catch((err: Error) => {
          console.log('Error setting badge:', err);
        });
      } else {
        (navigator as any).clearAppBadge().catch((err: Error) => {
          console.log('Error clearing badge:', err);
        });
      }
    }
    
    // Also notify the service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BADGE_COUNT',
        count: newCount
      });
    }
  }, []);

  const fetchCount = useCallback(async () => {
    if (!companyId) return;

    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { count: unreadCount } = await query;
      updateBadge(unreadCount || 0);
    } catch (error) {
      console.error('Error fetching badge count:', error);
    }
  }, [companyId, branchId, updateBadge]);

  // Set up real-time subscription
  useEffect(() => {
    if (!companyId) return;

    // Initial fetch
    fetchCount();

    // Subscribe to changes
    const channel = supabase
      .channel('badge-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    // Listen for badge count requests from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GET_BADGE_COUNT') {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SET_BADGE_COUNT',
            count
          });
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      supabase.removeChannel(channel);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [companyId, branchId, fetchCount, count]);

  const decrementCount = useCallback(() => {
    updateBadge(Math.max(0, count - 1));
  }, [count, updateBadge]);

  const clearBadge = useCallback(() => {
    updateBadge(0);
  }, [updateBadge]);

  return {
    count,
    fetchCount,
    decrementCount,
    clearBadge,
    updateBadge
  };
};
