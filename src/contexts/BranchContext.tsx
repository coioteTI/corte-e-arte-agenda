import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/hooks/useUserRole';

interface Branch {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  is_active: boolean;
  company_id?: string;
}

interface BranchContextType {
  currentBranch: Branch | null;
  currentBranchId: string | null;
  companyId: string | null;
  branches: Branch[];
  userRole: AppRole | null;
  loading: boolean;
  setCurrentBranch: (branchId: string) => Promise<boolean>;
  refreshBranches: () => Promise<void>;
  hasModuleAccess: (moduleKey: string) => boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// Define module permissions for each role
const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  employee: ['agenda', 'clientes', 'servicos', 'ranking', 'profissionais', 'historico'],
  admin: ['agenda', 'clientes', 'servicos', 'ranking', 'profissionais', 'historico', 'horarios', 'estoque', 'configuracoes', 'salarios', 'funcionarios'],
  ceo: ['agenda', 'clientes', 'servicos', 'ranking', 'profissionais', 'historico', 'horarios', 'estoque', 'configuracoes', 'salarios', 'planos', 'relatorios', 'funcionarios'],
};

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Start true, set false quickly if no user
  const [initialized, setInitialized] = useState(false);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: userId });
      
      const role = roleData as AppRole || 'ceo';
      setUserRole(role);
      return role;
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('ceo');
      return 'ceo' as AppRole;
    }
  }, []);

  const fetchBranches = useCallback(async (userId: string, role: AppRole): Promise<{ branches: Branch[]; companyId: string | null }> => {
    let fetchedCompanyId: string | null = null;
    
    try {
      if (role === 'ceo') {
        // First get the company owned by this CEO
        const { data: ownedCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        fetchedCompanyId = ownedCompany?.id || null;
        
        // Only fetch branches belonging to THIS company, not all branches
        if (fetchedCompanyId) {
          const { data } = await supabase
            .from('branches')
            .select('*')
            .eq('company_id', fetchedCompanyId)
            .eq('is_active', true)
            .order('name');
          
          setBranches(data || []);
          return { branches: data || [], companyId: fetchedCompanyId };
        } else {
          setBranches([]);
          return { branches: [], companyId: null };
        }
      } else {
        const { data } = await supabase
          .from('user_branches')
          .select('branch_id, is_primary, branches(id, name, address, city, state, phone, is_active, company_id)')
          .eq('user_id', userId);

        const branchList = data?.map(ub => ub.branches as unknown as Branch).filter(Boolean) || [];
        setBranches(branchList);
        
        if (branchList.length > 0 && branchList[0].company_id) {
          fetchedCompanyId = branchList[0].company_id;
        }
        
        return { branches: branchList, companyId: fetchedCompanyId };
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      return { branches: [], companyId: null };
    }
  }, []);

  const fetchCurrentSession = useCallback(async (userId: string) => {
    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('current_branch_id')
        .eq('user_id', userId)
        .maybeSingle();

      return session?.current_branch_id;
    } catch (error) {
      console.error('Error fetching current session:', error);
      return null;
    }
  }, []);

  const initialize = useCallback(async () => {
    // Prevent double initialization
    if (initialized) return;
    
    const startTime = Date.now();
    
    // Set a hard safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (!initialized) {
        console.warn('[BranchContext] Safety timeout reached, forcing initialization complete');
        setLoading(false);
        setInitialized(true);
      }
    }, 6000);
    
    try {
      // Use getSession for faster initial check with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (!result || !('data' in result) || !result.data.session?.user) {
        // No user or timeout - don't block
        clearTimeout(safetyTimeout);
        setLoading(false);
        setInitialized(true);
        return;
      }

      const user = result.data.session.user;

      // Fetch data with timeout protection
      const dataPromise = (async () => {
        const role = await fetchUserRole(user.id);
        const currentBranchIdResult = await fetchCurrentSession(user.id);
        const { branches: branchList, companyId: fetchedCompanyId } = await fetchBranches(user.id, role);
        return { role, currentBranchIdResult, branchList, fetchedCompanyId };
      })();

      const dataTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const data = await Promise.race([dataPromise, dataTimeout]);

      if (data) {
        setCompanyId(data.fetchedCompanyId);

        if (data.currentBranchIdResult) {
          const branch = data.branchList.find(b => b.id === data.currentBranchIdResult);
          if (branch) {
            setCurrentBranchState(branch);
          }
        }
      }
      
      console.log(`[BranchContext] Initialized in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('Error initializing branch context:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
      setInitialized(true);
    }
  }, [initialized, fetchUserRole, fetchBranches, fetchCurrentSession]);

  useEffect(() => {
    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear all state on sign out
        setCurrentBranchState(null);
        setBranches([]);
        setUserRole(null);
        setCompanyId(null);
        setInitialized(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Re-initialize on sign in
        setInitialized(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize]);

  const setCurrentBranch = async (branchId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const hasAccess = branches.some(b => b.id === branchId);
      if (!hasAccess) {
        console.error('[BranchContext] User does not have access to branch:', branchId);
        return false;
      }

      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          current_branch_id: branchId,
          session_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error setting branch:', error);
        return false;
      }

      const branch = branches.find(b => b.id === branchId);
      if (branch) {
        setCurrentBranchState(branch);
      }

      return true;
    } catch (error) {
      console.error('Error in setCurrentBranch:', error);
      return false;
    }
  };

  const refreshBranches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && userRole) {
      await fetchBranches(user.id, userRole);
    }
  };

  const hasModuleAccess = (moduleKey: string): boolean => {
    if (!userRole) return false;
    return ROLE_PERMISSIONS[userRole]?.includes(moduleKey) ?? false;
  };

  return (
    <BranchContext.Provider
      value={{
        currentBranch,
        currentBranchId: currentBranch?.id || null,
        companyId,
        branches,
        userRole,
        loading,
        setCurrentBranch,
        refreshBranches,
        hasModuleAccess,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
