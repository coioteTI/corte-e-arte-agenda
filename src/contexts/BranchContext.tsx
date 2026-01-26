import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/hooks/useUserRole';
import { useModuleSettingsContext } from '@/contexts/ModuleSettingsContext';

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
  const { setCompanyId: setModuleCompanyId } = useModuleSettingsContext();
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data: roleData } = await supabase
      .rpc('get_user_role', { _user_id: userId });
    
    setUserRole(roleData as AppRole || 'ceo');
    return roleData as AppRole || 'ceo';
  }, []);

  const fetchBranches = useCallback(async (userId: string, role: AppRole): Promise<{ branches: Branch[]; companyId: string | null }> => {
    let fetchedCompanyId: string | null = null;
    
    if (role === 'ceo') {
      // CEO can see all branches - get company first
      const { data: ownedCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      fetchedCompanyId = ownedCompany?.id || null;
      
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      setBranches(data || []);
      return { branches: data || [], companyId: fetchedCompanyId };
    } else {
      // Other roles see only assigned branches
      const { data } = await supabase
        .from('user_branches')
        .select('branch_id, is_primary, branches(id, name, address, city, state, phone, is_active, company_id)')
        .eq('user_id', userId);

      const branchList = data?.map(ub => ub.branches as unknown as Branch).filter(Boolean) || [];
      setBranches(branchList);
      
      // Get company_id from the first branch
      if (branchList.length > 0 && branchList[0].company_id) {
        fetchedCompanyId = branchList[0].company_id;
      }
      
      return { branches: branchList, companyId: fetchedCompanyId };
    }
  }, []);

  const fetchCurrentSession = useCallback(async (userId: string) => {
    const { data: session } = await supabase
      .from('user_sessions')
      .select('current_branch_id')
      .eq('user_id', userId)
      .single();

    return session?.current_branch_id;
  }, []);

  const initialize = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const role = await fetchUserRole(user.id);
      const { branches: branchList, companyId: fetchedCompanyId } = await fetchBranches(user.id, role);
      const currentBranchId = await fetchCurrentSession(user.id);

      // Set company ID from branches fetch result and sync with ModuleSettingsContext
      setCompanyId(fetchedCompanyId);
      if (fetchedCompanyId) {
        setModuleCompanyId(fetchedCompanyId);
      }

      if (currentBranchId) {
        const branch = branchList.find(b => b.id === currentBranchId);
        if (branch) {
          setCurrentBranchState(branch);
        }
      }
    } catch (error) {
      console.error('Error initializing branch context:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchUserRole, fetchBranches, fetchCurrentSession]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const setCurrentBranch = async (branchId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // If changing branches, this will trigger data reload in components
      const previousBranchId = currentBranch?.id;

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
        
        // Log branch switch for debugging
        if (previousBranchId && previousBranchId !== branchId) {
          console.log(`[BranchContext] Switched from branch ${previousBranchId} to ${branchId}`);
        }
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
