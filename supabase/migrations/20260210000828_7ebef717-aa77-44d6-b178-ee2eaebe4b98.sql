
-- Allow support tickets without a company (for contact form replies)
ALTER TABLE public.support_tickets ALTER COLUMN company_id DROP NOT NULL;

-- Create storage bucket for support audio messages
INSERT INTO storage.buckets (id, name, public) VALUES ('support-audio', 'support-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read support audio
CREATE POLICY "Support audio is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-audio');

-- Allow authenticated and service role to upload support audio
CREATE POLICY "Authenticated users can upload support audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-audio');

-- Allow deletion of support audio
CREATE POLICY "Support audio can be deleted"
ON storage.objects FOR DELETE
USING (bucket_id = 'support-audio');
