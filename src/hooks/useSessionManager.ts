import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Manages session lifecycle:
 * - Auto-logout at midnight (00:00) local time
 * - Users stay logged in until midnight, then must re-login
 */
export const useSessionManager = () => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleLogoutAtMidnight = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight

    const msUntilMidnight = midnight.getTime() - now.getTime();

    timerRef.current = setTimeout(async () => {
      console.log('Midnight reached - logging out user');
      await supabase.auth.signOut();
      window.location.href = '/login';
    }, msUntilMidnight);
  };

  useEffect(() => {
    // Check if session exists, schedule logout at midnight
    const checkAndSchedule = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        scheduleLogoutAtMidnight();
      }
    };

    checkAndSchedule();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        scheduleLogoutAtMidnight();
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
};
