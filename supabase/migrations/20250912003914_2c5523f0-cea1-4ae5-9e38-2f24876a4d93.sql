-- Fix security issues with the new functions by setting search path
CREATE OR REPLACE FUNCTION public.appointments_before_insert_payment_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.appointments_before_update_payment_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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