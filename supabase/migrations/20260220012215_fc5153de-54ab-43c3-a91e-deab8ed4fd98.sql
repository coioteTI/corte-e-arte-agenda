
-- Criar tabela de configurações de planos da plataforma
CREATE TABLE IF NOT EXISTS public.platform_plan_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_key text NOT NULL UNIQUE,
  plan_name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  features text[] DEFAULT '{}',
  payment_link text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'mensal',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir planos padrão
INSERT INTO public.platform_plan_settings (plan_key, plan_name, price, description, features, payment_link, is_active, sort_order, billing_period)
VALUES 
  ('premium_mensal', 'Premium Mensal', 79.90, 'Acesso completo mensal à plataforma', 
   ARRAY['Sistema completo de agendamentos', 'Gestão de clientes e serviços', 'Controle de horários e profissionais', 'Relatórios e análises avançadas', 'Suporte prioritário'],
   'https://pay.kirvano.com/9c9bce9b-547d-435e-91c9-0192f1a067e0', true, 1, 'mensal')
ON CONFLICT (plan_key) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_platform_plan_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_platform_plan_settings_updated_at
BEFORE UPDATE ON public.platform_plan_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_platform_plan_settings_updated_at();

-- RLS: apenas service_role pode modificar, leitura pública
ALTER TABLE public.platform_plan_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read plan settings"
ON public.platform_plan_settings
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage plan settings"
ON public.platform_plan_settings
FOR ALL
USING (true)
WITH CHECK (true);
