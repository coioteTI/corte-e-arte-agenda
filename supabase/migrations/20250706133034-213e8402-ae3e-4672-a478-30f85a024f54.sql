-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow authenticated users to insert companies" ON public.companies;
DROP POLICY IF EXISTS "Companies can insert their own data" ON public.companies;

-- Create a simple policy for authenticated users to insert companies
CREATE POLICY "authenticated_users_can_insert_companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());