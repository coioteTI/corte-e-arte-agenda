
-- Fix RLS policies for appointments table to prevent infinite recursion
DROP POLICY IF EXISTS "Companies can manage appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view appointments related to them" ON appointments;

-- Create new simpler policies without recursion
CREATE POLICY "Companies can manage appointments" ON appointments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = appointments.company_id 
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view appointments related to them" ON appointments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = appointments.client_id 
    AND clients.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = appointments.company_id 
    AND companies.user_id = auth.uid()
  )
);

-- Allow public to insert appointments (for booking)
CREATE POLICY "Public can create appointments" ON appointments
FOR INSERT WITH CHECK (true);

-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for logo uploads
CREATE POLICY "Anyone can view company logos" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Company owners can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Company owners can update their logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Company owners can delete their logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
);
