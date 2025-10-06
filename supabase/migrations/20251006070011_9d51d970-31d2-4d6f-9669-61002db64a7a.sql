-- Deletar dados relacionados à empresa 'Barbearia' (elsantosel934@gmail.com)
-- ID da empresa: d4fcbddc-5163-4828-8f24-dda6468b33ab

-- 1. Deletar likes da empresa
DELETE FROM public.likes 
WHERE target_type = 'company' 
AND target_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 2. Deletar favoritos da empresa
DELETE FROM public.favorites 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 3. Deletar agendamentos da empresa
DELETE FROM public.appointments 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 4. Deletar serviços da empresa
DELETE FROM public.services 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 5. Deletar profissionais da empresa
DELETE FROM public.professionals 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 6. Deletar templates de notificação da empresa
DELETE FROM public.notification_templates 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 7. Deletar configurações da empresa
DELETE FROM public.company_settings 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 8. Deletar assinaturas da empresa
DELETE FROM public.subscriptions 
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 9. Deletar fotos da galeria da empresa
DELETE FROM public.gallery
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 10. Deletar avaliações da empresa
DELETE FROM public.reviews
WHERE company_id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';

-- 11. Deletar a empresa
DELETE FROM public.companies 
WHERE id = 'd4fcbddc-5163-4828-8f24-dda6468b33ab';