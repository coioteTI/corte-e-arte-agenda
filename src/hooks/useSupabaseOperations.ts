import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Hook simplificado para operações seguras no Supabase
export const useSupabaseOperations = () => {
  const [loading, setLoading] = useState(false);

  // Inserir dados (sem tipagem genérica para evitar conflitos)
  const insertData = async (table: string, data: any, successMessage?: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        toast.error('Erro ao salvar dados');
        return { data: null, success: false };
      }

      if (successMessage) {
        toast.success(successMessage);
      }

      return { data: result, success: true };
    } catch (error) {
      console.error('Insert failed:', error);
      toast.error('Erro inesperado ao salvar');
      return { data: null, success: false };
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados
  const updateData = async (table: string, data: any, id: string, successMessage?: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await (supabase as any)
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        toast.error('Erro ao atualizar dados');
        return { data: null, success: false };
      }

      if (successMessage) {
        toast.success(successMessage);
      }

      return { data: result, success: true };
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Erro inesperado ao atualizar');
      return { data: null, success: false };
    } finally {
      setLoading(false);
    }
  };

  // Deletar dados
  const deleteData = async (table: string, id: string, successMessage?: string) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Erro ao remover item');
        return { success: false };
      }

      if (successMessage) {
        toast.success(successMessage);
      }

      return { success: true };
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Erro inesperado ao remover');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    insertData,
    updateData,
    deleteData
  };
};