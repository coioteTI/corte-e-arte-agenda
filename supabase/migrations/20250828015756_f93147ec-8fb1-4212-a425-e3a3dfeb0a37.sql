-- Investigar e corrigir o problema de Security Definer View

-- Primeiro, vamos verificar se existe uma view companies_public problemática
DROP VIEW IF EXISTS public.companies_public CASCADE;

-- Recriar a view de forma segura, SEM SECURITY DEFINER
CREATE VIEW public.companies_public AS
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
FROM public.companies c;

-- Habilitar RLS na view
ALTER VIEW public.companies_public SET (security_barrier = true);

-- Criar política RLS para a view que permite visualização pública dos dados da empresa
CREATE POLICY "Public companies view access" ON public.companies_public
FOR SELECT USING (true);

-- Verificar se há outras views com Security Definer e corrigi-las
-- Recriar qualquer função que possa estar sendo usada como view de forma inadequada

-- Corrigir a função get_public_company_data para não precisar de SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_public_company_data(uuid);

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
SECURITY INVOKER  -- Mudando para SECURITY INVOKER ao invés de DEFINER
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

-- Verificar e corrigir outras funções que podem estar causando problemas de segurança
-- Manter apenas as funções que realmente precisam de SECURITY DEFINER

-- A função get_company_rankings pode ser SECURITY INVOKER já que acessa apenas dados públicos
DROP FUNCTION IF EXISTS public.get_company_rankings();
CREATE OR REPLACE FUNCTION public.get_company_rankings()
RETURNS TABLE(id uuid, name text, likes_count integer, ranking integer)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Mudando para SECURITY INVOKER
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

-- A função get_company_rankings_by_appointments também pode ser SECURITY INVOKER
DROP FUNCTION IF EXISTS public.get_company_rankings_by_appointments();
CREATE OR REPLACE FUNCTION public.get_company_rankings_by_appointments()
RETURNS TABLE(id uuid, name text, appointments_count bigint, ranking bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Mudando para SECURITY INVOKER
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

-- Garantir que as funções que realmente precisam de SECURITY DEFINER estejam corretas
-- (como as que acessam auth.uid() ou fazem operações administrativas)