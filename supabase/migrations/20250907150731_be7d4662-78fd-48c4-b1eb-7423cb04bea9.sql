-- Verificar e corrigir políticas RLS para clientes
-- Remover todas as políticas existentes da tabela clients
DROP POLICY IF EXISTS "Public can create clients for appointments" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own client data" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own client data" ON public.clients;
DROP POLICY IF EXISTS "Companies can view their appointment clients" ON public.clients;
DROP POLICY IF EXISTS "Companies can delete their appointment clients" ON public.clients;

-- Política simples e permissiva para inserção de clientes (agendamentos públicos)
CREATE POLICY "Allow client insertion for appointments"
ON public.clients
FOR INSERT
TO public
WITH CHECK (true);

-- Política para visualização de clientes (usuários logados veem seus dados)
CREATE POLICY "Users can view own client data"
ON public.clients
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política para visualização de clientes por empresas
CREATE POLICY "Companies view appointment clients"  
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN companies c ON a.company_id = c.id
    WHERE a.client_id = clients.id 
    AND c.user_id = auth.uid()
  )
);

-- Política para atualização por usuários logados
CREATE POLICY "Users can update own client data"
ON public.clients
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Política para visualização pública (necessária para agendamentos)
CREATE POLICY "Public can view clients for appointments"
ON public.clients  
FOR SELECT
TO public
USING (true);