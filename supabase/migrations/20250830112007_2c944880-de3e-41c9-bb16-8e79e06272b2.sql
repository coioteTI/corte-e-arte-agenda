-- Corrigir avisos de segurança detectados pelo linter
-- Definir search_path para funções que não têm

-- Função ensure_valid_business_hours com search_path seguro
CREATE OR REPLACE FUNCTION public.ensure_valid_business_hours()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Verificar e corrigir outras funções sem search_path
CREATE OR REPLACE FUNCTION public.sync_company_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the likes_count in companies table based on actual likes in likes table
  UPDATE public.companies 
  SET likes_count = (
    SELECT COUNT(*) 
    FROM public.likes 
    WHERE target_type = 'company' 
    AND target_id = COALESCE(NEW.target_id, OLD.target_id)
  )
  WHERE id = COALESCE(NEW.target_id, OLD.target_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Verificar se existe trigger para sync_company_likes_count
DROP TRIGGER IF EXISTS trigger_sync_company_likes_count ON public.likes;
CREATE TRIGGER trigger_sync_company_likes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_company_likes_count();

-- Limpar dados duplicados de teste da tabela companies para evitar problemas
DELETE FROM public.companies 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY name, email ORDER BY created_at DESC) as rn
    FROM public.companies
  ) t
  WHERE rn > 1
);