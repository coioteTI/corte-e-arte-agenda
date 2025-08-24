-- Fix the security definer view issue by recreating the view properly
DROP VIEW IF EXISTS public.companies_public;

-- Create the view without security definer (default is security invoker which is safer)
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