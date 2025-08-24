-- Create a secure public view for companies that only exposes safe information
CREATE OR REPLACE VIEW public.companies_public AS
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

-- Grant public access to the view
GRANT SELECT ON public.companies_public TO anon, authenticated;

-- Remove the overly permissive RLS policy on companies table
DROP POLICY IF EXISTS "Public can view companies for search" ON public.companies;

-- Create a more restrictive policy that only allows authenticated company owners to see their own data
-- The public view will handle public access needs
CREATE POLICY "Public companies view access" ON public.companies
FOR SELECT 
USING (false); -- This effectively blocks direct table access, forcing use of the public view

-- Update the existing policy to be more explicit
DROP POLICY IF EXISTS "companies_select_own" ON public.companies;

CREATE POLICY "Company owners can view their own data" ON public.companies
FOR SELECT 
USING (user_id = auth.uid());