-- Create support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  category text NOT NULL DEFAULT 'general',
  created_by uuid NOT NULL,
  assigned_to text NULL,
  resolved_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create support ticket messages table (chat history)
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL DEFAULT 'company',
  sender_id uuid NULL,
  message text NOT NULL,
  attachments jsonb NULL DEFAULT '[]'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Company owners can view their tickets"
  ON public.support_tickets FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Company owners can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Company owners can update their tickets"
  ON public.support_tickets FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- RLS policies for support_messages
CREATE POLICY "Company owners can view their ticket messages"
  ON public.support_messages FOR SELECT
  USING (ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  ));

CREATE POLICY "Company owners can create messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  ));

-- Service role policies for Super Admin access
CREATE POLICY "Service role can manage all tickets"
  ON public.support_tickets FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all messages"
  ON public.support_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();