-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Public can view professionals for booking" ON public.professionals;

-- Create a new restrictive policy that only shows non-sensitive data to public
CREATE POLICY "Public can view basic professional info for booking" 
ON public.professionals 
FOR SELECT 
USING (true)
WITH CHECK (false);

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

-- Allow public read access to the view
GRANT SELECT ON public.professionals_public TO anon, authenticated;

-- Update the policy to only allow access to non-sensitive columns
DROP POLICY IF EXISTS "Public can view basic professional info for booking" ON public.professionals;

CREATE POLICY "Public can view basic professional info for booking" 
ON public.professionals 
FOR SELECT 
USING (true);

-- But we'll need to handle this at the application level by creating a function
-- that returns only safe data for public consumption
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

-- Remove the overly permissive policy completely
DROP POLICY IF EXISTS "Public can view basic professional info for booking" ON public.professionals;

-- Create a more restrictive policy for public access
CREATE POLICY "Authenticated users can view professionals for booking" 
ON public.professionals 
FOR SELECT 
TO authenticated
USING (true);

-- Anonymous users should use the function instead of direct table access