import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SuperAdminSession {
  token: string;
  expires_at: string;
  email: string;
}

interface SuperAdminContextType {
  session: SuperAdminSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

const SESSION_KEY = 'super_admin_session';

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SuperAdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SuperAdminSession;
        // Check if session is still valid
        if (new Date(parsed.expires_at) > new Date()) {
          setSession(parsed);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      const newSession: SuperAdminSession = {
        token: data.session.token,
        expires_at: data.session.expires_at,
        email: data.session.email,
      };

      setSession(newSession);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

      return { success: true };
    } catch (error) {
      console.error('Super admin login error:', error);
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  const logout = () => {
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <SuperAdminContext.Provider
      value={{
        session,
        isAuthenticated: !!session && new Date(session.expires_at) > new Date(),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
