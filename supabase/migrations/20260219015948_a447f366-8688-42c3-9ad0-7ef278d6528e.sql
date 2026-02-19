
-- 1. Update increment_trial_appointments trigger to work with ALL trial-type plans
CREATE OR REPLACE FUNCTION public.increment_trial_appointments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Incrementar contador para planos trial/teste (trial, pro, plano_teste, free)
  UPDATE public.companies
  SET trial_appointments_used = COALESCE(trial_appointments_used, 0) + 1
  WHERE id = NEW.company_id 
  AND plan IN ('trial', 'pro', 'plano_teste', 'free');
  
  RETURN NEW;
END;
$function$;

-- 2. Update can_create_appointment to use 20 as default limit and support all trial plans
CREATE OR REPLACE FUNCTION public.can_create_appointment(company_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  company_plan text;
  appointments_used integer;
  appointments_limit integer;
BEGIN
  SELECT plan, COALESCE(trial_appointments_used, 0), COALESCE(trial_appointments_limit, 20)
  INTO company_plan, appointments_used, appointments_limit
  FROM public.companies
  WHERE id = company_uuid;
  
  -- Premium plans have no limit
  IF company_plan IN ('premium_mensal', 'premium_anual') THEN
    RETURN true;
  END IF;
  
  -- Trial/test plans check limit
  IF company_plan IN ('trial', 'pro', 'plano_teste', 'free') THEN
    RETURN appointments_used < appointments_limit;
  END IF;
  
  -- Unknown plan - blocked
  RETURN false;
END;
$function$;

-- 3. Set default trial_appointments_limit to 20 for new companies
ALTER TABLE public.companies ALTER COLUMN trial_appointments_limit SET DEFAULT 20;
