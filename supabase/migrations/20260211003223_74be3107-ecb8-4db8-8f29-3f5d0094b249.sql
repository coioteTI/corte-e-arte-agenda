
-- Add ticket_id column to contact_messages to link contacts to tickets
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.support_tickets(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_contact_messages_ticket_id ON public.contact_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);
