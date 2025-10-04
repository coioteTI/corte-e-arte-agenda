-- Adicionar campos para controle de trial na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS trial_appointments_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_appointments_limit integer DEFAULT 20;

-- Atualizar empresas existentes para ter o plano 'trial' se tiverem 'nenhum'
UPDATE public.companies 
SET plan = 'trial', trial_appointments_limit = 20, trial_appointments_used = 0
WHERE plan = 'nenhum' OR plan = 'pro';

-- Criar função para incrementar contador de agendamentos trial
CREATE OR REPLACE FUNCTION public.increment_trial_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrementar contador apenas se a empresa estiver em trial
  UPDATE public.companies
  SET trial_appointments_used = trial_appointments_used + 1
  WHERE id = NEW.company_id 
  AND plan = 'trial';
  
  RETURN NEW;
END;
$$;

-- Criar trigger para incrementar contador quando novo agendamento é criado
DROP TRIGGER IF EXISTS increment_trial_counter ON public.appointments;
CREATE TRIGGER increment_trial_counter
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.increment_trial_appointments();

-- Criar função para verificar se empresa pode criar agendamentos
CREATE OR REPLACE FUNCTION public.can_create_appointment(company_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_plan text;
  appointments_used integer;
  appointments_limit integer;
BEGIN
  SELECT plan, trial_appointments_used, trial_appointments_limit
  INTO company_plan, appointments_used, appointments_limit
  FROM public.companies
  WHERE id = company_uuid;
  
  -- Se tem plano premium, pode criar
  IF company_plan IN ('premium_mensal', 'premium_anual') THEN
    RETURN true;
  END IF;
  
  -- Se está em trial, verificar limite
  IF company_plan = 'trial' THEN
    RETURN appointments_used < appointments_limit;
  END IF;
  
  -- Qualquer outro caso, não pode criar
  RETURN false;
END;
$$;