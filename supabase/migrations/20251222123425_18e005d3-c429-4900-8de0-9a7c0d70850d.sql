
-- Create table for module settings
CREATE TABLE public.module_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  module_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  disabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_key)
);

-- Enable RLS
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for company owners
CREATE POLICY "Company owners can manage their module settings"
ON public.module_settings
FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_module_settings_updated_at
BEFORE UPDATE ON public.module_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
