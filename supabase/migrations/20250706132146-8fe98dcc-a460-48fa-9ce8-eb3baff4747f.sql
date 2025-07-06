-- Allow authenticated users to insert company data
CREATE POLICY "Allow authenticated users to insert companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());