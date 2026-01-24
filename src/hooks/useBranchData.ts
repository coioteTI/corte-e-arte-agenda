import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBranch } from '@/contexts/BranchContext';
import { toast } from 'sonner';

// Timeout padrão de 15 segundos para requisições
const DEFAULT_TIMEOUT = 15000;

interface UseBranchDataOptions {
  timeout?: number;
  onError?: (error: Error) => void;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastBranchId: string | null;
}

export function useBranchData<T>(
  fetchFn: (companyId: string, branchId: string | null, shouldFilter: boolean) => Promise<T>,
  options: UseBranchDataOptions = {}
) {
  const { timeout = DEFAULT_TIMEOUT, onError } = options;
  const { currentBranchId, userRole, loading: branchLoading } = useBranch();
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
    lastBranchId: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const shouldFilterByBranch = userRole !== 'ceo' && !!currentBranchId;

  // Limpar cache e estado quando a filial muda
  const clearState = useCallback(() => {
    setState({
      data: null,
      loading: true,
      error: null,
      lastBranchId: currentBranchId,
    });
  }, [currentBranchId]);

  const fetchData = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      lastBranchId: currentBranchId,
    }));

    // Configurar timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutIdRef.current = setTimeout(() => {
        abortControllerRef.current?.abort();
        reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.'));
      }, timeout);
    });

    try {
      // Buscar company_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) {
        throw new Error('Empresa não encontrada');
      }

      // Race entre fetch e timeout
      const result = await Promise.race([
        fetchFn(company.id, currentBranchId, shouldFilterByBranch),
        timeoutPromise,
      ]);

      // Limpar timeout após sucesso
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      setState({
        data: result,
        loading: false,
        error: null,
        lastBranchId: currentBranchId,
      });

      return result;
    } catch (error) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      if (onError && error instanceof Error) {
        onError(error);
      }

      // Mostrar toast apenas se não for uma requisição abortada intencionalmente
      if (!(error instanceof Error && error.name === 'AbortError')) {
        toast.error(errorMessage);
      }

      return null;
    }
  }, [currentBranchId, shouldFilterByBranch, fetchFn, timeout, onError]);

  // Detectar mudança de filial e limpar/recarregar dados
  useEffect(() => {
    if (branchLoading) return;

    // Se a filial mudou, limpar estado e recarregar
    if (state.lastBranchId !== currentBranchId || state.data === null) {
      clearState();
      fetchData();
    }

    return () => {
      // Cleanup ao desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [currentBranchId, branchLoading, fetchData, clearState, state.lastBranchId, state.data]);

  return {
    ...state,
    refetch: fetchData,
    shouldFilterByBranch,
    currentBranchId,
    userRole,
  };
}

// Helper para construir query com filtro de branch
export function applyBranchFilter<T extends { or: (filter: string) => T }>(
  query: T,
  branchId: string | null,
  shouldFilter: boolean
): T {
  if (shouldFilter && branchId) {
    return query.or(`branch_id.eq.${branchId},branch_id.is.null`);
  }
  return query;
}

// Hook simplificado para páginas que só precisam do companyId
export function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Usuário não autenticado');
          setLoading(false);
          return;
        }

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (companyError || !company) {
          setError('Empresa não encontrada');
        } else {
          setCompanyId(company.id);
        }
      } catch (err) {
        setError('Erro ao buscar empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyId();
  }, []);

  return { companyId, loading, error };
}
