-- Criar tabela de avaliações dos clientes
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas para avaliações
CREATE POLICY "Clientes podem criar suas próprias avaliações"
ON public.reviews 
FOR INSERT 
WITH CHECK (client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));

CREATE POLICY "Todos podem visualizar avaliações"
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Clientes podem atualizar suas próprias avaliações"
ON public.reviews 
FOR UPDATE 
USING (client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));

-- Adicionar avatar_url aos clientes
ALTER TABLE public.clients ADD COLUMN avatar_url TEXT;

-- Criar tabela de notificações push
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para push subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias subscriptions"
ON public.push_subscriptions 
FOR ALL 
USING (user_id = auth.uid() OR client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));

-- Trigger para updated_at em reviews
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_reviews_company_id ON public.reviews(company_id);
CREATE INDEX idx_reviews_professional_id ON public.reviews(professional_id);
CREATE INDEX idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_client_id ON public.push_subscriptions(client_id);