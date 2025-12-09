-- Atualizar o limite padrão de agendamentos trial para 50
ALTER TABLE public.companies 
ALTER COLUMN trial_appointments_limit SET DEFAULT 50;

-- Atualizar empresas existentes em trial que ainda têm o limite antigo de 20
UPDATE public.companies 
SET trial_appointments_limit = 50 
WHERE plan = 'trial' AND trial_appointments_limit = 20;