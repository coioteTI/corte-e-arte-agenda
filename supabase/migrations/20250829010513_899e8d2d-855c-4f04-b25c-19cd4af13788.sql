-- Remove existing policies that might be conflicting
DROP POLICY IF EXISTS "companies_insert_policy" ON companies;
DROP POLICY IF EXISTS "Companies can update their own data" ON companies;
DROP POLICY IF EXISTS "Restrict public access to companies table" ON companies;

-- Create specific policy for authenticated users to insert their own company
CREATE POLICY "user_can_insert_company"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for authenticated users to update their own company
CREATE POLICY "user_can_update_company"
ON companies
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for service_role (webhook) to have full access
CREATE POLICY "service_role_full_access"
ON companies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Keep existing policies for SELECT and DELETE for authenticated users
-- (these should already exist and work correctly)