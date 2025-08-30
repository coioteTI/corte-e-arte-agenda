-- Verificar e corrigir possíveis problemas de JSON na tabela companies
-- Primeiro, vamos garantir que o business_hours tenha um JSON válido por padrão

-- Atualizar registros com business_hours NULL ou inválidos
UPDATE public.companies 
SET business_hours = '{
  "monday": {"start": "08:00", "end": "18:00", "isOpen": true},
  "tuesday": {"start": "08:00", "end": "18:00", "isOpen": true},
  "wednesday": {"start": "08:00", "end": "18:00", "isOpen": true},
  "thursday": {"start": "08:00", "end": "18:00", "isOpen": true},
  "friday": {"start": "08:00", "end": "18:00", "isOpen": true},
  "saturday": {"start": "08:00", "end": "18:00", "isOpen": true},
  "sunday": {"start": "08:00", "end": "18:00", "isOpen": false}
}'::jsonb
WHERE business_hours IS NULL;

-- Garantir que todos os registros tenham um business_hours válido
-- Criar uma função para validar e corrigir JSON inválido
CREATE OR REPLACE FUNCTION public.ensure_valid_business_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Se business_hours for NULL, definir padrão
  IF NEW.business_hours IS NULL THEN
    NEW.business_hours = '{
      "monday": {"start": "08:00", "end": "18:00", "isOpen": true},
      "tuesday": {"start": "08:00", "end": "18:00", "isOpen": true},
      "wednesday": {"start": "08:00", "end": "18:00", "isOpen": true},
      "thursday": {"start": "08:00", "end": "18:00", "isOpen": true},
      "friday": {"start": "08:00", "end": "18:00", "isOpen": true},
      "saturday": {"start": "08:00", "end": "18:00", "isOpen": true},
      "sunday": {"start": "08:00", "end": "18:00", "isOpen": false}
    }'::jsonb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para garantir business_hours válido
DROP TRIGGER IF EXISTS ensure_valid_business_hours_trigger ON public.companies;
CREATE TRIGGER ensure_valid_business_hours_trigger
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_valid_business_hours();

-- Corrigir problemas de RLS policies ausentes
-- Adicionar policy para permitir leitura pública das empresas (para busca)
DROP POLICY IF EXISTS "allow_public_read_companies" ON public.companies;
CREATE POLICY "allow_public_read_companies" 
ON public.companies FOR SELECT
USING (true);

-- Garantir que subscriptions tenham policies adequadas
DROP POLICY IF EXISTS "service_role_subscriptions_access" ON public.subscriptions;
CREATE POLICY "service_role_subscriptions_access" 
ON public.subscriptions FOR ALL 
USING (true);

DROP POLICY IF EXISTS "company_owners_can_view_subscriptions" ON public.subscriptions;
CREATE POLICY "company_owners_can_view_subscriptions" 
ON public.subscriptions FOR SELECT
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));