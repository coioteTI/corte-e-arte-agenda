-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'new_appointment',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Company owners can view all notifications"
ON public.notifications
FOR SELECT
USING (
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'ceo'::app_role)
);

CREATE POLICY "Users with branch access can view branch notifications"
ON public.notifications
FOR SELECT
USING (
  has_branch_access(auth.uid(), branch_id)
);

CREATE POLICY "Users with branch access can update notifications"
ON public.notifications
FOR UPDATE
USING (
  has_branch_access(auth.uid(), branch_id)
  OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_branch_id ON public.notifications(branch_id);
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create function to auto-create notification on new appointment
CREATE OR REPLACE FUNCTION public.create_appointment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
  v_service_name TEXT;
  v_professional_name TEXT;
  v_company_id UUID;
BEGIN
  -- Get client name
  SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  
  -- Get service name
  SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
  
  -- Get professional name
  SELECT name INTO v_professional_name FROM professionals WHERE id = NEW.professional_id;
  
  -- Get company_id
  v_company_id := NEW.company_id;
  
  -- Insert notification
  INSERT INTO notifications (
    branch_id,
    appointment_id,
    company_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.branch_id,
    NEW.id,
    v_company_id,
    'new_appointment',
    '🔔 Novo Agendamento',
    COALESCE(v_client_name, 'Cliente') || ' agendou ' || COALESCE(v_service_name, 'serviço') || ' para ' || TO_CHAR(NEW.appointment_date, 'DD/MM') || ' às ' || TO_CHAR(NEW.appointment_time, 'HH24:MI'),
    jsonb_build_object(
      'client_name', v_client_name,
      'service_name', v_service_name,
      'professional_name', v_professional_name,
      'appointment_date', NEW.appointment_date,
      'appointment_time', NEW.appointment_time,
      'payment_method', NEW.payment_method
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new appointments
CREATE TRIGGER on_new_appointment_notify
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_notification();

-- Add notification settings columns to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS notification_sound_enabled BOOLEAN DEFAULT true;