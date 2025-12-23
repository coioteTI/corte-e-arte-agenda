-- Add timezone column to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Update existing records to use Brazil timezone as default
UPDATE public.company_settings 
SET timezone = 'America/Sao_Paulo' 
WHERE timezone IS NULL;