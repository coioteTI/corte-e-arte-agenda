-- Create a consolidated view for payment history with names
CREATE OR REPLACE VIEW public.appointment_payments_view AS
SELECT 
  a.id,
  a.company_id,
  a.client_id,
  a.professional_id,
  a.service_id,
  a.appointment_date,
  a.appointment_time,
  a.total_price,
  a.payment_method,
  a.payment_status,
  a.payment_confirmation_date,
  a.pix_payment_proof,
  a.created_at,
  COALESCE(cl.name, 'Cliente não identificado') AS client_name,
  COALESCE(s.name, 'Serviço não identificado') AS service_name,
  COALESCE(p.name, 'Profissional não identificado') AS professional_name
FROM public.appointments a
LEFT JOIN public.clients cl ON cl.id = a.client_id
LEFT JOIN public.services s ON s.id = a.service_id
LEFT JOIN public.professionals p ON p.id = a.professional_id;

-- Enforce business rules on appointments for payment flow
CREATE OR REPLACE FUNCTION public.appointments_before_insert_payment_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Payment defaults and release logic
  IF NEW.payment_method = 'pix' THEN
    IF NEW.payment_status IS NULL THEN
      NEW.payment_status := 'awaiting_payment';
    END IF;
    -- Do not auto-confirm PIX appointments
    IF NEW.status IS NULL OR NEW.status = '' THEN
      NEW.status := 'scheduled';
    END IF;
  ELSIF NEW.payment_method = 'no_local' THEN
    IF NEW.payment_status IS NULL THEN
      NEW.payment_status := 'pending';
    END IF;
    -- Pay on site: release immediately
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_before_insert_payment_rules ON public.appointments;
CREATE TRIGGER trg_appointments_before_insert_payment_rules
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.appointments_before_insert_payment_rules();

CREATE OR REPLACE FUNCTION public.appointments_before_update_payment_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- When payment gets confirmed, stamp date and confirm appointment
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    NEW.payment_confirmation_date := now();
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_before_update_payment_rules ON public.appointments;
CREATE TRIGGER trg_appointments_before_update_payment_rules
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.appointments_before_update_payment_rules();