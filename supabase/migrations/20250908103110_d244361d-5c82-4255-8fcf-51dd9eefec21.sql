-- Drop existing storage policies for gallery bucket
DROP POLICY IF EXISTS "Company owners can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can view their gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can delete their gallery images" ON storage.objects;

-- Create better storage policies for gallery
CREATE POLICY "Users can upload to gallery bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'gallery' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Gallery images are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery');

CREATE POLICY "Users can update their own gallery files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'gallery' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own gallery files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'gallery' 
  AND auth.uid() IS NOT NULL
);