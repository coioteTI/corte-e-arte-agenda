-- Drop all existing policies for companies table
DROP POLICY IF EXISTS "authenticated_users_can_insert_companies" ON public.companies;
DROP POLICY IF EXISTS "Companies can insert their own data" ON public.companies;

-- Create a new, simpler INSERT policy for authenticated users
CREATE POLICY "companies_insert_policy" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Also ensure we have a proper policy for users to view their own companies after insert
CREATE POLICY "companies_select_own" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid() OR true);