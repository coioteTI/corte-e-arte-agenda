-- Remove the overly permissive public policy that exposes sensitive data
DROP POLICY IF EXISTS "Public can view company profiles" ON public.companies;

-- Create a restrictive policy that denies public access to the full companies table
-- This forces use of specific queries or views for public access
CREATE POLICY "Restrict public access to companies table" ON public.companies
FOR SELECT 
USING (false);

-- Create a public view that only exposes safe, non-sensitive fields
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

-- Grant access to the public view
GRANT SELECT ON public.companies_public TO anon, authenticated;

-- For backward compatibility, create a function that returns public company data
CREATE OR REPLACE FUNCTION get_public_company_data(company_uuid uuid DEFAULT NULL)
RETURNS TABLE (
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
LANGUAGE SQL
SECURITY DEFINER
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