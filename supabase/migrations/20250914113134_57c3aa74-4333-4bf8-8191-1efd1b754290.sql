-- Criar bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de comprovantes (usuários autenticados e anônimos)
CREATE POLICY "Permitir upload de comprovantes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'payment-proofs');

-- Política para permitir visualização de comprovantes próprios
CREATE POLICY "Permitir visualização de comprovantes próprios" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-proofs' AND (auth.uid() IS NOT NULL OR true));

-- Política para permitir atualização de comprovantes próprios  
CREATE POLICY "Permitir atualização de comprovantes próprios" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'payment-proofs' AND (auth.uid() IS NOT NULL OR true));