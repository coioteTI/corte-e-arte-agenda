-- Corrigir o plano da BARBEARIA DA VILA para premium_anual
UPDATE companies 
SET 
  plan = 'premium_anual',
  subscription_status = 'active',
  subscription_start_date = '2025-12-17 11:56:00+00',
  subscription_end_date = '2026-12-17 11:56:00+00',
  updated_at = now()
WHERE email = 'dilclebinho@hotmail.com';