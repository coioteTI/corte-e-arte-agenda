-- Corrigir o problema de Security Definer View

-- Remover a view problemática companies_public
DROP VIEW IF EXISTS public.companies_public CASCADE;

-- Não vamos recriar a view companies_public, pois ela não é necessária
-- Os dados das empresas podem ser acessados diretamente através da tabela companies
-- com as políticas RLS adequadas

-- Verificar se há outras definições problemáticas e limpá-las
-- Verificar as funções que podem estar usando SECURITY DEFINER desnecessariamente

-- Manter apenas as funções que realmente precisam de SECURITY DEFINER
-- (aquelas que acessam auth.uid() ou fazem operações administrativas)

-- As funções get_public_company_data, get_company_rankings e get_company_rankings_by_appointments
-- podem ser SECURITY INVOKER já que acessam apenas dados que já são públicos

CREATE OR REPLACE FUNCTION public.get_public_company_data(company_uuid uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  address text, 
  number text, 
  neighborhood text, 
  city text, 
  state text, 
  zip_code text, 
  business_hours jsonb, 
  likes_count integer, 
  instagram text, 
  plan text, 
  primary_color text, 
  logo_url text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id,
    c.name,
    c.address,
    c.number,
    c.neighborhood,
    c.city,
    c.state,
    c.zip_code,
    c.business_hours,
    c.likes_count,
    c.instagram,
    c.plan,
    c.primary_color,
    c.logo_url,
    c.created_at,
    c.updated_at
  FROM public.companies c
  WHERE (company_uuid IS NULL OR c.id = company_uuid);
$$;

CREATE OR REPLACE FUNCTION public.get_company_rankings()
RETURNS TABLE(id uuid, name text, likes_count integer, ranking integer)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.likes_count,
    ROW_NUMBER() OVER (ORDER BY c.likes_count DESC)::INTEGER as ranking
  FROM public.companies c
  ORDER BY c.likes_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_rankings_by_appointments()
RETURNS TABLE(id uuid, name text, appointments_count bigint, ranking bigint)
LANGUAGE plpgsql
STABLE  
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(a.appointments_count, 0) as appointments_count,
    ROW_NUMBER() OVER (ORDER BY COALESCE(a.appointments_count, 0) DESC) as ranking
  FROM public.companies c
  LEFT JOIN (
    SELECT 
      company_id,
      COUNT(*) as appointments_count
    FROM public.appointments
    WHERE 
      status IN ('scheduled', 'confirmed', 'completed')
      AND appointment_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND appointment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY company_id
  ) a ON c.id = a.company_id
  ORDER BY appointments_count DESC;
END;
$$;