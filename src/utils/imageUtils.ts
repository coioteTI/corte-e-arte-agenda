import { supabase } from "@/integrations/supabase/client";

/**
 * Função para obter a URL completa da logo da barbearia
 * Trata tanto URLs completas quanto caminhos do Supabase Storage
 */
export const getLogoUrl = (logo: string | null | undefined): string | null => {
  if (!logo) return null;

  // Se já for uma URL completa (http ou https), usa direto
  if (logo.startsWith("http")) {
    return logo;
  }

  // Se for um caminho do Supabase Storage, constrói a URL completa
  if (logo.includes("company-logos/")) {
    return supabase.storage.from("company-logos").getPublicUrl(logo.replace("company-logos/", "")).data.publicUrl;
  }

  // Se for apenas o nome do arquivo, assume que está no bucket company-logos
  return supabase.storage.from("company-logos").getPublicUrl(logo).data.publicUrl;
};

/**
 * Função utilitária para verificar se uma URL de logo é válida
 */
export const isValidLogoUrl = (logoUrl: string | null): boolean => {
  if (!logoUrl) return false;
  return logoUrl.startsWith("http") || logoUrl.includes("company-logos/");
};