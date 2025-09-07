-- Corrigir políticas RLS da tabela appointments
-- Remover políticas conflitantes
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Companies can manage appointments" ON public.appointments; 
DROP POLICY IF EXISTS "Users can view appointments related to them" ON public.appointments;

-- Política simples para criação pública de agendamentos
CREATE POLICY "appointments_public_insert"
ON public.appointments
FOR INSERT
WITH CHECK (true);

-- Política para empresas visualizarem e gerenciarem seus agendamentos
CREATE POLICY "appointments_company_access"
ON public.appointments
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- Política para visualização pública (necessária para verificar disponibilidade)
CREATE POLICY "appointments_public_select"
ON public.appointments
FOR SELECT
USING (true);

-- Política para clientes verem seus próprios agendamentos (quando logados)
CREATE POLICY "appointments_client_select"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);