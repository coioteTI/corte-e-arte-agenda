import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleSetting {
  id: string;
  module_key: string;
  module_name: string;
  is_enabled: boolean;
  disabled_at: string | null;
}

export const DEFAULT_MODULES = [
  { key: 'agenda', name: 'Agenda', url: '/dashboard/agenda' },
  { key: 'clientes', name: 'Clientes', url: '/dashboard/clientes' },
  { key: 'servicos', name: 'Serviços', url: '/dashboard/servicos' },
  { key: 'profissionais', name: 'Profissionais', url: '/dashboard/profissionais' },
  { key: 'funcionarios', name: 'Funcionários', url: '/dashboard/funcionarios' },
  { key: 'estoque', name: 'Estoque', url: '/dashboard/estoque' },
  { key: 'historico', name: 'Histórico', url: '/dashboard/historico' },
  { key: 'salarios', name: 'Salários', url: '/dashboard/salarios' },
  { key: 'ranking', name: 'Ranking', url: '/dashboard/ranking' },
  { key: 'relatorios', name: 'Relatórios', url: '/dashboard/relatorios' },
  { key: 'horarios', name: 'Horários', url: '/dashboard/horarios' },
  { key: 'planos', name: 'Plano', url: '/dashboard/planos' },
];

interface ModuleSettingsContextType {
  modules: ModuleSetting[];
  loading: boolean;
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
  toggleModule: (moduleKey: string, enabled: boolean) => Promise<boolean>;
  getEnabledModules: () => ModuleSetting[];
  getDisabledModules: () => ModuleSetting[];
  isModuleEnabled: (moduleKey: string) => boolean;
  refreshModules: () => Promise<void>;
}

const ModuleSettingsContext = createContext<ModuleSettingsContextType | null>(null);

export const useModuleSettingsContext = () => {
  const context = useContext(ModuleSettingsContext);
  if (!context) {
    throw new Error('useModuleSettingsContext must be used within ModuleSettingsProvider');
  }
  return context;
};

interface ModuleSettingsProviderProps {
  children: ReactNode;
}

export const ModuleSettingsProvider = ({ children }: ModuleSettingsProviderProps) => {
  const [modules, setModules] = useState<ModuleSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      // If no modules exist, create defaults
      if (!data || data.length === 0) {
        const defaultModules = DEFAULT_MODULES.map(m => ({
          company_id: companyId,
          module_key: m.key,
          module_name: m.name,
          is_enabled: true,
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('module_settings')
          .insert(defaultModules)
          .select();

        if (insertError) throw insertError;
        setModules(insertedData || []);
      } else {
        // Check if any default modules are missing
        const existingKeys = new Set(data.map(m => m.module_key));
        const missingModules = DEFAULT_MODULES.filter(m => !existingKeys.has(m.key));

        if (missingModules.length > 0) {
          const newModules = missingModules.map(m => ({
            company_id: companyId,
            module_key: m.key,
            module_name: m.name,
            is_enabled: true,
          }));

          const { data: insertedData, error: insertError } = await supabase
            .from('module_settings')
            .insert(newModules)
            .select();

          if (insertError) throw insertError;
          setModules([...data, ...(insertedData || [])]);
        } else {
          setModules(data);
        }
      }
    } catch (error) {
      console.error('Error loading module settings:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Load modules when companyId changes
  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Subscribe to realtime updates for module_settings
  useEffect(() => {
    if (!companyId) return;

    console.log('Setting up realtime subscription for module_settings, companyId:', companyId);

    const channel = supabase
      .channel(`module-settings-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'module_settings',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('Module settings realtime update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ModuleSetting;
            setModules(prev => 
              prev.map(m => m.id === updated.id ? updated : m)
            );
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as ModuleSetting;
            setModules(prev => {
              // Check if module already exists (avoid duplicates)
              if (prev.find(m => m.id === inserted.id)) return prev;
              return [...prev, inserted];
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setModules(prev => prev.filter(m => m.id !== deleted.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Module settings subscription status:', status);
      });

    return () => {
      console.log('Cleaning up module settings subscription');
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const toggleModule = useCallback(async (moduleKey: string, enabled: boolean) => {
    if (!companyId) return false;

    // Optimistic update for instant UI feedback
    setModules(prev =>
      prev.map(m =>
        m.module_key === moduleKey
          ? { ...m, is_enabled: enabled, disabled_at: enabled ? null : new Date().toISOString() }
          : m
      )
    );

    try {
      const { error } = await supabase
        .from('module_settings')
        .update({
          is_enabled: enabled,
          disabled_at: enabled ? null : new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('module_key', moduleKey);

      if (error) {
        // Revert on error
        loadModules();
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling module:', error);
      return false;
    }
  }, [companyId, loadModules]);

  const getEnabledModules = useCallback(() => {
    return modules.filter(m => m.is_enabled);
  }, [modules]);

  const getDisabledModules = useCallback(() => {
    return modules.filter(m => !m.is_enabled);
  }, [modules]);

  const isModuleEnabled = useCallback((moduleKey: string) => {
    const module = modules.find(m => m.module_key === moduleKey);
    return module?.is_enabled ?? true;
  }, [modules]);

  return (
    <ModuleSettingsContext.Provider
      value={{
        modules,
        loading,
        companyId,
        setCompanyId,
        toggleModule,
        getEnabledModules,
        getDisabledModules,
        isModuleEnabled,
        refreshModules: loadModules,
      }}
    >
      {children}
    </ModuleSettingsContext.Provider>
  );
};
