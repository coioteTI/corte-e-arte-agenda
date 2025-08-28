-- Primeiro, vamos remover as políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Company owners can manage their services" ON public.services;
DROP POLICY IF EXISTS "Company owners can manage their professionals" ON public.professionals;

-- Criar políticas RLS corretas (sem vírgulas desnecessárias)
CREATE POLICY "Company owners can manage their services insert" ON public.services
FOR INSERT WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Company owners can manage their services update" ON public.services
FOR UPDATE USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Company owners can manage their services delete" ON public.services
FOR DELETE USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Company owners can manage their professionals insert" ON public.professionals
FOR INSERT WITH CHECK (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Company owners can manage their professionals update" ON public.professionals
FOR UPDATE USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Company owners can manage their professionals delete" ON public.professionals
FOR DELETE USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

-- Adicionar política de DELETE para companies
CREATE POLICY "Company owners can delete their own company" ON public.companies
FOR DELETE USING (user_id = auth.uid());

-- Adicionar política de DELETE para profiles
CREATE POLICY "Users can delete their own profile" ON public.profiles
FOR DELETE USING (user_id = auth.uid());

-- Adicionar política de DELETE para clients (para permitir que empresas deletem clientes criados por elas)
CREATE POLICY "Company owners can delete their clients" ON public.clients
FOR DELETE USING (
  id IN (
    SELECT DISTINCT a.client_id
    FROM appointments a
    WHERE a.company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  )
);

-- Criar função para exclusão completa de conta com segurança adequada
CREATE OR REPLACE FUNCTION public.delete_user_account(company_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Verificar se o usuário é o dono da empresa
  SELECT user_id INTO user_uuid FROM public.companies WHERE id = company_uuid AND user_id = auth.uid();
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User does not own this company';
  END IF;

  -- Deletar todos os dados relacionados à empresa (na ordem correta para evitar conflitos de chave estrangeira)
  
  -- 1. Deletar likes da empresa
  DELETE FROM public.likes WHERE target_type = 'company' AND target_id = company_uuid;
  
  -- 2. Deletar favoritos da empresa
  DELETE FROM public.favorites WHERE company_id = company_uuid;
  
  -- 3. Deletar agendamentos da empresa
  DELETE FROM public.appointments WHERE company_id = company_uuid;
  
  -- 4. Deletar clientes da empresa (que não tenham user_id - ou seja, criados pela empresa)
  DELETE FROM public.clients WHERE id IN (
    SELECT DISTINCT a.client_id
    FROM appointments a
    WHERE a.company_id = company_uuid
  );
  
  -- 5. Deletar serviços da empresa
  DELETE FROM public.services WHERE company_id = company_uuid;
  
  -- 6. Deletar profissionais da empresa
  DELETE FROM public.professionals WHERE company_id = company_uuid;
  
  -- 7. Deletar templates de notificação da empresa
  DELETE FROM public.notification_templates WHERE company_id = company_uuid;
  
  -- 8. Deletar configurações da empresa
  DELETE FROM public.company_settings WHERE company_id = company_uuid;
  
  -- 9. Deletar assinaturas da empresa
  DELETE FROM public.subscriptions WHERE company_id = company_uuid;
  
  -- 10. Deletar a empresa
  DELETE FROM public.companies WHERE id = company_uuid;
  
  -- 11. Deletar o perfil do usuário
  DELETE FROM public.profiles WHERE user_id = user_uuid;
  
  RETURN true;
END;
$$;