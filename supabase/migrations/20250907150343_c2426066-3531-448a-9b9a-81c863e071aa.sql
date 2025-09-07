-- Remover políticas conflitantes e criar novas mais permissivas para clientes públicos
DROP POLICY IF EXISTS "Users can insert client data" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own client data" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own client data" ON public.clients;
DROP POLICY IF EXISTS "Companies can view their clients" ON public.clients;
DROP POLICY IF EXISTS "Company owners can delete their clients" ON public.clients;

-- Política para permitir inserção de clientes públicos (agendamentos sem login)
CREATE POLICY "Public can create clients for appointments"
ON public.clients
FOR INSERT
WITH CHECK (true);

-- Política para usuários logados verem seus próprios dados
CREATE POLICY "Users can view their own client data"
ON public.clients
FOR SELECT
USING (user_id = auth.uid());

-- Política para usuários logados atualizarem seus próprios dados  
CREATE POLICY "Users can update their own client data"
ON public.clients
FOR UPDATE
USING (user_id = auth.uid());

-- Política para empresas verem clientes que agendaram com elas
CREATE POLICY "Companies can view their appointment clients"
ON public.clients
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT a.client_id
    FROM appointments a
    JOIN companies c ON a.company_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- Política para empresas deletarem clientes que agendaram com elas
CREATE POLICY "Companies can delete their appointment clients"
ON public.clients
FOR DELETE
USING (
  id IN (
    SELECT DISTINCT a.client_id
    FROM appointments a
    JOIN companies c ON a.company_id = c.id
    WHERE c.user_id = auth.uid()
  )
);