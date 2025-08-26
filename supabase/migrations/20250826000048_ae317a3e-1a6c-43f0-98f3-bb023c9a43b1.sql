-- Fix the security definer view by dropping it and using a regular view
DROP VIEW IF EXISTS public.companies_public;

-- Create a regular view without security definer
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
  business_hours,
  likes_count,
  instagram,
  plan,
  primary_color,
  logo_url,
  created_at,
  updated_at
FROM public.companies;

-- Create a policy on the view to allow public access
CREATE POLICY "Allow public read access to company basic info" ON public.companies_public
FOR SELECT 
USING (true);

-- Enable RLS on the view
ALTER VIEW public.companies_public ENABLE ROW LEVEL SECURITY;

-- Fix the function by setting search_path
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
SET search_path = public
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