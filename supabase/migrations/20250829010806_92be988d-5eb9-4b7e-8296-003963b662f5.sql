-- Verificar se as políticas foram removidas e recriar corretamente
-- Remove qualquer política conflitante
DROP POLICY IF EXISTS "user_can_insert_company" ON companies;
DROP POLICY IF EXISTS "user_can_update_company" ON companies;
DROP POLICY IF EXISTS "service_role_full_access" ON companies;

-- Criar política específica para INSERT (usuários autenticados podem inserir apenas com seu próprio user_id)
CREATE POLICY "users_can_insert_companies"
ON companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Criar política para UPDATE (usuários podem atualizar apenas suas próprias empresas)
CREATE POLICY "users_can_update_companies"
ON companies
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar política para SELECT (usuários podem ver apenas suas próprias empresas)
CREATE POLICY "users_can_view_companies"
ON companies
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Criar política para DELETE (usuários podem deletar apenas suas próprias empresas)
CREATE POLICY "users_can_delete_companies"
ON companies
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Política para service_role (webhook) ter acesso total
CREATE POLICY "service_role_full_access"
ON companies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);