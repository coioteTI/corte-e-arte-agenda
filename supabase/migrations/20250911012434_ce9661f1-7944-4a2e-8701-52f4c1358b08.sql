-- Create RLS policies for PIX proof uploads to gallery bucket
CREATE POLICY "Allow anyone to upload PIX proofs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'gallery' 
  AND (storage.foldername(name))[1] LIKE 'pix-proofs'
);

CREATE POLICY "Allow anyone to view PIX proofs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'gallery' 
  AND (storage.foldername(name))[1] LIKE 'pix-proofs'
);