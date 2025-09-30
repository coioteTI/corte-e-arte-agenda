-- Criar tabela para logs dos webhooks da Kirvano
CREATE TABLE public.kirvano_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  evento text NOT NULL,
  produto text,
  recebido_em timestamp with time zone NOT NULL DEFAULT now(),
  status_execucao text NOT NULL DEFAULT 'success',
  detalhes jsonb,
  user_found boolean DEFAULT false,
  plan_updated boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar índices para melhorar performance
CREATE INDEX idx_kirvano_logs_email ON public.kirvano_logs(email);
CREATE INDEX idx_kirvano_logs_evento ON public.kirvano_logs(evento);
CREATE INDEX idx_kirvano_logs_recebido_em ON public.kirvano_logs(recebido_em DESC);

-- Habilitar RLS
ALTER TABLE public.kirvano_logs ENABLE ROW LEVEL SECURITY;

-- Policy para donos de empresa visualizarem seus logs
CREATE POLICY "Company owners can view kirvano logs"
ON public.kirvano_logs
FOR SELECT
TO authenticated
USING (
  email IN (
    SELECT c.email
    FROM companies c
    WHERE c.user_id = auth.uid()
  )
);

-- Policy para o webhook inserir logs
CREATE POLICY "Webhook function can insert kirvano logs"
ON public.kirvano_logs
FOR INSERT
TO authenticated
WITH CHECK (true);