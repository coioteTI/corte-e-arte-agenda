import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'employee' | 'admin' | 'ceo';

interface UserRoleState {
  role: AppRole | null;
  loading: boolean;
  error: string | null;
}

interface UserSession {
  currentBranchId: string | null;
  sessionStartedAt: string | null;
}

// Define module permissions for each role
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  employee: ['agenda', 'clientes', 'servicos', 'ranking', 'profissionais', 'historico'],
  admin: ['agenda', 'clientes', 'servicos', 'ranking', 'profissionais', 'historico', 'horarios', 'estoque', 'configuracoes', 'salarios', 'funcionarios'],
  ceo: ['agenda', 'clientes', 'servicos', 'ranking', 'profissionais', 'historico', 'horarios', 'estoque', 'configuracoes', 'salarios', 'planos', 'relatorios', 'funcionarios'],
};

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    loading: true,
    error: null,
  });
  const [session, setSession] = useState<UserSession>({
    currentBranchId: null,
    sessionStartedAt: null,
  });
  const [branches, setBranches] = useState<Array<{ id: string; name: string; is_primary: boolean }>>([]);

  const fetchUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ role: null, loading: false, error: 'Usuário não autenticado' });
        return;
      }

      // Get user role using the database function
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (roleError) {
        console.error('Error fetching role:', roleError);
        // If no role found, user might be the company owner (CEO by default)
        setState({ role: 'ceo', loading: false, error: null });
        return;
      }

      setState({
        role: roleData as AppRole || 'ceo',
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error in fetchUserRole:', error);
      setState({ role: null, loading: false, error: error.message });
    }
  }, []);

  const fetchUserSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessionData } = await supabase
        .from('user_sessions')
        .select('current_branch_id, session_started_at')
        .eq('user_id', user.id)
        .single();

      if (sessionData) {
        setSession({
          currentBranchId: sessionData.current_branch_id,
          sessionStartedAt: sessionData.session_started_at,
        });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  }, []);

  const fetchUserBranches = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For CEO, get all branches
      if (state.role === 'ceo') {
        const { data: allBranches } = await supabase
          .from('branches')
          .select('id, name')
          .eq('is_active', true);

        if (allBranches) {
          setBranches(allBranches.map(b => ({ ...b, is_primary: false })));
        }
      } else {
        // For other roles, get assigned branches
        const { data: userBranches } = await supabase
          .from('user_branches')
          .select('branch_id, is_primary, branches(id, name)')
          .eq('user_id', user.id);

        if (userBranches) {
          setBranches(userBranches.map(ub => ({
            id: (ub.branches as any)?.id,
            name: (ub.branches as any)?.name,
            is_primary: ub.is_primary,
          })).filter(b => b.id));
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, [state.role]);

  const setCurrentBranch = useCallback(async (branchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Upsert user session
      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          current_branch_id: branchId,
          session_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error setting branch:', error);
        return false;
      }

      setSession(prev => ({
        ...prev,
        currentBranchId: branchId,
        sessionStartedAt: new Date().toISOString(),
      }));

      return true;
    } catch (error) {
      console.error('Error in setCurrentBranch:', error);
      return false;
    }
  }, []);

  const hasModuleAccess = useCallback((moduleKey: string): boolean => {
    if (!state.role) return false;
    return ROLE_PERMISSIONS[state.role]?.includes(moduleKey) ?? false;
  }, [state.role]);

  const hasSessionActive = useCallback((): boolean => {
    return !!session.currentBranchId && !!session.sessionStartedAt;
  }, [session]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  useEffect(() => {
    if (state.role) {
      fetchUserSession();
      fetchUserBranches();
    }
  }, [state.role, fetchUserSession, fetchUserBranches]);

  return {
    ...state,
    session,
    branches,
    setCurrentBranch,
    hasModuleAccess,
    hasSessionActive,
    refetch: fetchUserRole,
  };
};
