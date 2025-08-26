-- Create webhook_logs table for tracking Kiwify webhook events
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  evento TEXT NOT NULL,
  produto TEXT,
  token_received TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_found BOOLEAN DEFAULT false,
  plan_updated BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only (companies can view their webhook logs)
CREATE POLICY "Company owners can view webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (email IN (
  SELECT c.email 
  FROM public.companies c 
  WHERE c.user_id = auth.uid()
));

-- Create policy for webhook function to insert logs
CREATE POLICY "Webhook function can insert logs" 
ON public.webhook_logs 
FOR INSERT 
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX idx_webhook_logs_email ON public.webhook_logs(email);
CREATE INDEX idx_webhook_logs_processed_at ON public.webhook_logs(processed_at DESC);