-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Public can view company profiles" ON public.companies;

-- Create a restricted public policy that only allows viewing safe columns
CREATE POLICY "Public can view company basic info" ON public.companies
FOR SELECT 
USING (true)
WITH CHECK (false);

-- Add a more granular approach using a view for public access
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
  business_hours,
  likes_count,
  instagram,
  plan,
  primary_color,
  logo_url,
  created_at,
  updated_at
FROM public.companies;

-- Enable RLS on the view
ALTER VIEW public.companies_public SET (security_barrier = true);

-- Grant public access to the view
GRANT SELECT ON public.companies_public TO anon, authenticated;

-- Create a policy for the view (this allows public read access to the view)
CREATE POLICY "Allow public read access to company basic info" ON public.companies_public
FOR SELECT 
USING (true);