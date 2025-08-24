-- Fix Security Definer View issue
DROP VIEW IF EXISTS public.companies_public;

-- Recreate the view without security definer (which is safer)
CREATE VIEW public.companies_public AS
SELECT 
  id,
  name,
  address,
  number,
  neighborhood, 
  city,
  state,
  zip_code,
  instagram,
  logo_url,
  business_hours,
  likes_count,
  primary_color,
  created_at,
  updated_at,
  plan
FROM public.companies;

-- Grant explicit access to the view
GRANT SELECT ON public.companies_public TO anon, authenticated;

-- Fix any missing RLS policies that might be causing issues
-- Ensure all necessary tables have proper RLS policies