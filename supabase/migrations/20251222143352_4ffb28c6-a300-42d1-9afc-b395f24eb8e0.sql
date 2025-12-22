-- Add avatar_url column to professionals table
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for professional avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-avatars', 'professional-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for professional avatars
CREATE POLICY "Anyone can view professional avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-avatars');

CREATE POLICY "Authenticated users can upload professional avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'professional-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update professional avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'professional-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete professional avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'professional-avatars' AND auth.role() = 'authenticated');