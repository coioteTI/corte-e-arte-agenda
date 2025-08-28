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
  DELETE FROM public.clients WHERE company_id = company_uuid AND user_id IS NULL;
  
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

-- Criar políticas RLS necessárias para permitir que a função funcione

-- Políticas para a tabela likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes" ON public.likes
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON public.likes
FOR ALL USING (user_id = auth.uid());

-- Políticas para a tabela favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view favorites" ON public.favorites
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own favorites" ON public.favorites
FOR ALL USING (user_id = auth.uid());

-- Políticas para a tabela clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage their clients" ON public.clients
FOR ALL USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their own client profile" ON public.clients
FOR ALL USING (user_id = auth.uid());

-- Políticas para a tabela appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage their appointments" ON public.appointments
FOR ALL USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Clients can view their own appointments" ON public.appointments
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- Políticas para a tabela services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view services" ON public.services
FOR SELECT USING (true);

CREATE POLICY "Company owners can manage their services" ON public.services
FOR INSERT, UPDATE, DELETE USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

-- Políticas para a tabela professionals
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view professionals" ON public.professionals
FOR SELECT USING (true);

CREATE POLICY "Company owners can manage their professionals" ON public.professionals
FOR INSERT, UPDATE, DELETE USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

-- Políticas para a tabela notification_templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage their notification templates" ON public.notification_templates
FOR ALL USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

-- Políticas para a tabela company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage their settings" ON public.company_settings
FOR ALL USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

-- Políticas para a tabela subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage their subscriptions" ON public.subscriptions
FOR ALL USING (
  company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

-- Políticas para a tabela companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view companies" ON public.companies
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own company" ON public.companies
FOR INSERT, UPDATE, DELETE USING (user_id = auth.uid());

-- Políticas para a tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own profile" ON public.profiles
FOR INSERT, UPDATE, DELETE USING (user_id = auth.uid());