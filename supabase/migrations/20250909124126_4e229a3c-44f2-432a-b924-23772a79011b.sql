-- Adicionar campos de configuração de pagamento na tabela company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['no_local']::TEXT[], -- ['pix', 'no_local']
ADD COLUMN IF NOT EXISTS requires_payment_confirmation BOOLEAN DEFAULT false;

-- Adicionar campos de pagamento na tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'confirmed'
ADD COLUMN IF NOT EXISTS payment_confirmation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pix_payment_proof TEXT; -- URL da comprovação de pagamento PIX

-- Remover a função existente e recriar com novos campos
DROP FUNCTION IF EXISTS public.get_or_create_company_settings(uuid);

CREATE OR REPLACE FUNCTION public.get_or_create_company_settings(company_uuid uuid)
RETURNS TABLE(
  id uuid, 
  company_id uuid, 
  email_notifications boolean, 
  whatsapp_notifications boolean, 
  reminders_enabled boolean, 
  confirmations_enabled boolean, 
  online_booking_enabled boolean, 
  online_payment_enabled boolean, 
  advanced_reports_enabled boolean, 
  whatsapp_integration_enabled boolean, 
  primary_color text, 
  secondary_color text,
  pix_key text,
  pix_qr_code text,
  payment_methods text[],
  requires_payment_confirmation boolean,
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Try to get existing settings
  RETURN QUERY
  SELECT 
    cs.id,
    cs.company_id,
    cs.email_notifications,
    cs.whatsapp_notifications,
    cs.reminders_enabled,
    cs.confirmations_enabled,
    cs.online_booking_enabled,
    cs.online_payment_enabled,
    cs.advanced_reports_enabled,
    cs.whatsapp_integration_enabled,
    cs.primary_color,
    cs.secondary_color,
    cs.pix_key,
    cs.pix_qr_code,
    cs.payment_methods,
    cs.requires_payment_confirmation,
    cs.created_at,
    cs.updated_at
  FROM public.company_settings cs 
  WHERE cs.company_id = company_uuid;
  
  -- If no settings found, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.company_settings (
      company_id, 
      pix_key, 
      payment_methods, 
      requires_payment_confirmation
    )
    VALUES (
      company_uuid, 
      null, 
      ARRAY['no_local']::TEXT[], 
      false
    );
    
    RETURN QUERY
    SELECT 
      cs.id,
      cs.company_id,
      cs.email_notifications,
      cs.whatsapp_notifications,
      cs.reminders_enabled,
      cs.confirmations_enabled,
      cs.online_booking_enabled,
      cs.online_payment_enabled,
      cs.advanced_reports_enabled,
      cs.whatsapp_integration_enabled,
      cs.primary_color,
      cs.secondary_color,
      cs.pix_key,
      cs.pix_qr_code,
      cs.payment_methods,
      cs.requires_payment_confirmation,
      cs.created_at,
      cs.updated_at
    FROM public.company_settings cs 
    WHERE cs.company_id = company_uuid;
  END IF;
END;
$function$;