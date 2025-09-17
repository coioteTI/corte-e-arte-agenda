-- Create RLS policies for payment-proofs bucket
CREATE POLICY "Allow company owners to view their payment proofs"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'payment-proofs' 
  AND (
    -- Allow company owners to view proofs from their appointments
    EXISTS (
      SELECT 1 
      FROM appointments a
      JOIN companies c ON a.company_id = c.id
      WHERE a.comprovante_url LIKE '%' || name
      AND c.user_id = auth.uid()
    )
    OR
    -- Allow the uploader (client) to view their own proof
    auth.uid() = owner
  )
);

CREATE POLICY "Allow authenticated users to insert payment proofs"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.uid() = owner
);

CREATE POLICY "Allow authenticated users to update payment proofs"
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid() = owner
);

CREATE POLICY "Allow authenticated users to delete payment proofs"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid() = owner
);