-- Adicionar campo para controle de criação de filiais pelo Super Admin
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS can_create_branches boolean NOT NULL DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.companies.can_create_branches IS 'Indica se a empresa está autorizada pelo Super Admin a criar novas filiais';

-- Por padrão, empresas existentes não podem criar filiais até aprovação
UPDATE public.companies SET can_create_branches = false WHERE can_create_branches IS NULL;