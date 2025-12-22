import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleSetting {
  id: string;
  module_key: string;
  module_name: string;
  is_enabled: boolean;
  disabled_at: string | null;
}

// Default modules configuration
export const DEFAULT_MODULES = [
  { key: 'agenda', name: 'Agenda', url: '/dashboard/agenda' },
  { key: 'clientes', name: 'Clientes', url: '/dashboard/clientes' },
  { key: 'servicos', name: 'Serviços', url: '/dashboard/servicos' },
  { key: 'profissionais', name: 'Profissionais', url: '/dashboard/profissionais' },
  { key: 'estoque', name: 'Estoque', url: '/dashboard/estoque' },
  { key: 'historico', name: 'Histórico', url: '/dashboard/historico' },
  { key: 'salarios', name: 'Salários', url: '/dashboard/salarios' },
  { key: 'ranking', name: 'Ranking', url: '/dashboard/ranking' },
  { key: 'relatorios', name: 'Relatórios', url: '/dashboard/relatorios' },
  { key: 'horarios', name: 'Horários', url: '/dashboard/horarios' },
  { key: 'planos', name: 'Plano', url: '/dashboard/planos' },
];

export const useModuleSettings = (companyId: string | null) => {
  const [modules, setModules] = useState<ModuleSetting[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const toggleModule = useCallback(async (moduleKey: string, enabled: boolean) => {
    if (!companyId) return false;

    try {
      const { error } = await supabase
        .from('module_settings')
        .update({
          is_enabled: enabled,
          disabled_at: enabled ? null : new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('module_key', moduleKey);

      if (error) throw error;

      setModules(prev =>
        prev.map(m =>
          m.module_key === moduleKey
            ? { ...m, is_enabled: enabled, disabled_at: enabled ? null : new Date().toISOString() }
            : m
        )
      );

      return true;
    } catch (error) {
      console.error('Error toggling module:', error);
      return false;
    }
  }, [companyId]);

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

  return {
    modules,
    loading,
    toggleModule,
    getEnabledModules,
    getDisabledModules,
    isModuleEnabled,
    refreshModules: loadModules,
  };
};
