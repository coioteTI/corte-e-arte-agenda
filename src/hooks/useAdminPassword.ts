import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAdminPassword = () => {
  const [loading, setLoading] = useState(false);

  // Verificar se a empresa tem senha de admin configurada
  const hasAdminPassword = useCallback(async (companyId: string): Promise<boolean> => {
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

      return !!(data?.admin_password_hash);
    } catch (error) {
      console.error('Error checking admin password:', error);
      return false;
    }
  }, []);

  // Definir ou atualizar senha de admin (usando hash simples no cliente)
  const setAdminPassword = useCallback(async (companyId: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Usar hash simples para armazenar a senha
      // Nota: Em produção, isso deveria ser feito no servidor com bcrypt
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // First check if company_settings exists
      const { data: existingSettings } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      let error;
      
      if (existingSettings) {
        // Update existing settings
        const result = await supabase
          .from('company_settings')
          .update({ admin_password_hash: hashHex })
          .eq('company_id', companyId);
        error = result.error;
      } else {
        // Create new settings with the password
        const result = await supabase
          .from('company_settings')
          .insert({ 
            company_id: companyId, 
            admin_password_hash: hashHex 
          });
        error = result.error;
      }

      if (error) throw error;

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
    setLoading(true);
    try {
      // Gerar hash da senha informada
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Buscar hash armazenado
      const { data: settings, error } = await supabase
        .from('company_settings')
        .select('admin_password_hash')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

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
    setLoading(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({ admin_password_hash: null })
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
