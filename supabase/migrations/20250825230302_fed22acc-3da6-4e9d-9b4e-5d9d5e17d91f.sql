-- Fix Security Definer View issue
-- Drop the insecure companies_public view
DROP VIEW IF EXISTS public.companies_public;

-- Update the companies table RLS policy to allow public read access
-- Remove the restrictive policy that blocks public access
DROP POLICY IF EXISTS "Public companies view access" ON public.companies;

-- Create a new policy for public read access to companies
CREATE POLICY "Public can view company profiles" 
ON public.companies 
FOR SELECT 
USING (true);

-- Keep the existing owner policies intact for updates
-- The "Companies can view their own data" and "Company owners can view their own data" policies remain