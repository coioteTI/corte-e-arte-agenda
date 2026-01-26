import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Verificar se há um usuário logado
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Check if this is first access
        if (user) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('is_first_access')
            .eq('user_id', user.id)
            .limit(1);

          // Handle case where there might be multiple profiles or none
          const profile = Array.isArray(profiles) ? profiles[0] : profiles;
          setIsFirstAccess(profile?.is_first_access ?? false);
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Re-check first access status
          const { data: profiles } = await supabase
            .from('profiles')
            .select('is_first_access')
            .eq('user_id', session.user.id)
            .limit(1);

          const profile = Array.isArray(profiles) ? profiles[0] : profiles;
          setIsFirstAccess(profile?.is_first_access ?? false);
        } else {
          setIsFirstAccess(false);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If first access and not already on criar-senha page, redirect there
  if (isFirstAccess && location.pathname !== '/criar-senha') {
    return <Navigate to="/criar-senha" replace />;
  }

  return <>{children}</>;
};