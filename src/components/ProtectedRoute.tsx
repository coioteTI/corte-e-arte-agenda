import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    
    // Safety timeout - never wait more than 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[ProtectedRoute] Safety timeout reached, forcing load completion');
        setLoading(false);
      }
    }, 5000);
    
    // Verificar se há um usuário logado - using getSession for speed
    const checkUser = async () => {
      try {
        // Add timeout for getSession
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!mounted) return;
        
        if (!result || !('data' in result) || !result.data.session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }
        
        const session = result.data.session;
        setUser(session.user);

        // Check if this is first access with timeout
        try {
          const profilePromise = supabase
            .from('profiles')
            .select('is_first_access')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          const profileTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
          const profileResult = await Promise.race([profilePromise, profileTimeout]);

          if (mounted && profileResult && 'data' in profileResult) {
            setIsFirstAccess(profileResult.data?.is_first_access ?? false);
          }
        } catch (profileError) {
          console.warn('Profile fetch failed, continuing anyway:', profileError);
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkUser();

    // Escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Re-check first access status
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('is_first_access')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (mounted) {
                setIsFirstAccess(profile?.is_first_access ?? false);
              }
            } catch (error) {
              console.warn('Profile fetch in auth change failed:', error);
            }
          }, 0);
        } else {
          if (mounted) {
            setIsFirstAccess(false);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
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
