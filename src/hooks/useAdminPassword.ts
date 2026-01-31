import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function to generate SHA-256 hash
const generateHash = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useAdminPassword = () => {
  const [loading, setLoading] = useState(false);

  // Verificar se a empresa tem senha de admin configurada
  const hasAdminPassword = useCallback(async (companyId: string): Promise<boolean> => {
    if (!companyId) return false;
    
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('admin_password_hash')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin password:', error);
        return false;
      }

      return !!(data?.admin_password_hash && data.admin_password_hash.trim().length > 0);
    } catch (error) {
      console.error('Error checking admin password:', error);
      return false;
    }
  }, []);

  // Definir ou atualizar senha de admin
  const setAdminPassword = useCallback(async (companyId: string, password: string): Promise<boolean> => {
    if (!companyId || !password) {
      toast.error('Dados inválidos');
      return false;
    }
    
    setLoading(true);
    try {
      // Generate password hash
      const hashHex = await generateHash(password);

      // Check if company_settings exists
      const { data: existingSettings, error: checkError } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking settings:', checkError);
        throw checkError;
      }

      let result;
      
      if (existingSettings?.id) {
        // Update existing settings using the id
        result = await supabase
          .from('company_settings')
          .update({ 
            admin_password_hash: hashHex,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSettings.id);
      } else {
        // Create new settings
        result = await supabase
          .from('company_settings')
          .insert({ 
            company_id: companyId, 
            admin_password_hash: hashHex 
          });
      }

      if (result.error) {
        console.error('Error saving password:', result.error);
        throw result.error;
      }

      toast.success('Senha de administrador definida com sucesso!');
      return true;
    } catch (error) {
      console.error('Error setting admin password:', error);
      toast.error('Erro ao definir senha de administrador');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validar senha de admin
  const validateAdminPassword = useCallback(async (companyId: string, password: string): Promise<boolean> => {
    if (!companyId || !password) {
      toast.error('Dados inválidos');
      return false;
    }
    
    setLoading(true);
    try {
      // Generate hash of the provided password
      const hashHex = await generateHash(password);

      // Fetch stored hash
      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('admin_password_hash')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }

      if (!settings?.admin_password_hash) {
        toast.error('Senha de administrador não configurada');
        return false;
      }

      const isValid = settings.admin_password_hash === hashHex;
      
      if (!isValid) {
        toast.error('Senha de administrador incorreta');
      }

      return isValid;
    } catch (error) {
      console.error('Error validating admin password:', error);
      toast.error('Erro ao validar senha');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Remover senha de admin
  const removeAdminPassword = useCallback(async (companyId: string): Promise<boolean> => {
    if (!companyId) return false;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({ 
          admin_password_hash: null,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Senha de administrador removida');
      return true;
    } catch (error) {
      console.error('Error removing admin password:', error);
      toast.error('Erro ao remover senha');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    hasAdminPassword,
    setAdminPassword,
    validateAdminPassword,
    removeAdminPassword,
  };
};
