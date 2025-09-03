-- Atualizar política de inserção de reviews para permitir clientes anônimos
DROP POLICY IF EXISTS "Clientes podem criar suas próprias avaliações" ON public.reviews;

CREATE POLICY "Clientes podem criar avaliações" 
ON public.reviews 
FOR INSERT 
WITH CHECK (
  -- Permite inserção se o cliente tem user_id e é o usuário autenticado
  -- OU se o cliente não tem user_id (cliente anônimo)
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid() 
    OR user_id IS NULL
  )
);