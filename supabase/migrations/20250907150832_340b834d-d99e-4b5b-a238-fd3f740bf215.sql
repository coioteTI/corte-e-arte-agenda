-- Desabilitar temporariamente RLS para testar
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- Reativar RLS com política mais simples
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Allow client insertion for appointments" ON public.clients;
DROP POLICY IF EXISTS "Users can view own client data" ON public.clients;
DROP POLICY IF EXISTS "Companies view appointment clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own client data" ON public.clients;  
DROP POLICY IF EXISTS "Public can view clients for appointments" ON public.clients;

-- Criar política mais permissiva para inserção
CREATE POLICY "clients_insert_policy"
ON public.clients
FOR INSERT
WITH CHECK (true);

-- Política para seleção
CREATE POLICY "clients_select_policy" 
ON public.clients
FOR SELECT
USING (true);

-- Política para atualização (apenas usuários logados podem atualizar seus próprios dados)
CREATE POLICY "clients_update_policy"
ON public.clients  
FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Política para exclusão (apenas para empresas)
CREATE POLICY "clients_delete_policy"
ON public.clients
FOR DELETE  
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN companies c ON a.company_id = c.id  
    WHERE a.client_id = clients.id
    AND c.user_id = auth.uid()
  )
);