-- TESTE: Simplificar completamente as políticas RLS para debug
-- Desabilitar RLS temporariamente para appointments
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;

-- Reabilitar com políticas mais simples
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas conflitantes
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_company_access" ON public.appointments;
DROP POLICY IF EXISTS "appointments_public_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_client_select" ON public.appointments;

-- Criar política super simples para inserção (temporária para teste)
CREATE POLICY "allow_all_insert_appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

-- Política simples para seleção
CREATE POLICY "allow_all_select_appointments"
ON public.appointments
FOR SELECT
USING (true);

-- Política para empresas (UPDATE/DELETE)
CREATE POLICY "companies_manage_appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "companies_delete_appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);