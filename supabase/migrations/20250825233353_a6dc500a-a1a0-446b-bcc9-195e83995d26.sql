-- Delete all related data for "Barbearia do jã 3" company
-- Company ID: 1c004fdb-743f-4575-b2cf-b5da42b9fc87

-- Delete appointments
DELETE FROM public.appointments 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete services
DELETE FROM public.services 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete professionals  
DELETE FROM public.professionals 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete likes for this company
DELETE FROM public.likes 
WHERE target_type = 'company' AND target_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete favorites for this company
DELETE FROM public.favorites 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete company settings
DELETE FROM public.company_settings 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete subscriptions
DELETE FROM public.subscriptions 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Delete notification templates
DELETE FROM public.notification_templates 
WHERE company_id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';

-- Finally, delete the company itself
DELETE FROM public.companies 
WHERE id = '1c004fdb-743f-4575-b2cf-b5da42b9fc87';