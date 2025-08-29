-- Primeiro, vamos dropar todas as políticas existentes para garantir que não há conflito
DROP POLICY IF EXISTS "users_can_insert_companies" ON companies;
DROP POLICY IF EXISTS "users_can_update_companies" ON companies;
DROP POLICY IF EXISTS "users_can_view_companies" ON companies; 
DROP POLICY IF EXISTS "users_can_delete_companies" ON companies;
DROP POLICY IF EXISTS "service_role_full_access" ON companies;
DROP POLICY IF EXISTS "Companies can view their own data" ON companies;
DROP POLICY IF EXISTS "Company owners can view their own data" ON companies;
DROP POLICY IF EXISTS "Company owners can delete their own company" ON companies;

-- Criar política simples para INSERT que funciona para usuários autenticados
CREATE POLICY "allow_authenticated_insert_companies" 
ON companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política para SELECT (usuários podem ver apenas suas empresas)
CREATE POLICY "users_can_select_own_companies"
ON companies
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Política para UPDATE (usuários podem atualizar apenas suas empresas)
CREATE POLICY "users_can_update_own_companies"
ON companies
FOR UPDATE
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para DELETE (usuários podem deletar apenas suas empresas)  
CREATE POLICY "users_can_delete_own_companies"
ON companies
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Política para service_role (webhook) ter acesso total
CREATE POLICY "service_role_companies_access"
ON companies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);