-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Public can view professionals for booking" ON public.professionals;

-- Create a function that returns only safe professional data for public consumption
CREATE OR REPLACE FUNCTION public.get_professionals_for_booking(company_uuid uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  name text,
  specialty text,
  is_available boolean,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.company_id,
    p.name,
    p.specialty,
    p.is_available,
    p.created_at
  FROM public.professionals p
  WHERE (company_uuid IS NULL OR p.company_id = company_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a view for public professional data (excluding sensitive contact info)
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  company_id,
  name,
  specialty,
  is_available,
  created_at
FROM public.professionals;

-- Grant access to the view for public users
GRANT SELECT ON public.professionals_public TO anon, authenticated;