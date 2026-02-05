-- Create table to store contact messages
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  source text DEFAULT 'chat_widget',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Only service role can access (for edge functions)
CREATE POLICY "Service role only for contact_messages"
ON public.contact_messages
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for efficient queries
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_is_read ON public.contact_messages(is_read);