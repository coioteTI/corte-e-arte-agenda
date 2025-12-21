-- Adicionar campo para senha de administrador na tabela company_settings
ALTER TABLE public.company_settings 
ADD COLUMN admin_password_hash TEXT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.company_settings.admin_password_hash IS 'Hash da senha de administrador para ações sensíveis';