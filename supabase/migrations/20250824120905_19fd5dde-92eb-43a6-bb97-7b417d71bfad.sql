-- Fix security issues identified by linter

-- Update security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS TABLE(company_id uuid) AS $$
  SELECT id FROM public.companies WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS uuid AS $$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- Update other existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_likes(company_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.companies 
  SET likes_count = likes_count + 1 
  WHERE id = company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_company_rankings()
RETURNS TABLE(id uuid, name text, likes_count integer, ranking integer) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.likes_count,
    ROW_NUMBER() OVER (ORDER BY c.likes_count DESC)::INTEGER as ranking
  FROM public.companies c
  ORDER BY c.likes_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_company_rankings_by_appointments()
RETURNS TABLE(id uuid, name text, appointments_count bigint, ranking bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(a.appointments_count, 0) as appointments_count,
    ROW_NUMBER() OVER (ORDER BY COALESCE(a.appointments_count, 0) DESC) as ranking
  FROM public.companies c
  LEFT JOIN (
    SELECT 
      company_id,
      COUNT(*) as appointments_count
    FROM public.appointments
    WHERE 
      status IN ('scheduled', 'confirmed', 'completed')
      AND appointment_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND appointment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY company_id
  ) a ON c.id = a.company_id
  ORDER BY appointments_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_or_create_company_settings(company_uuid uuid)
RETURNS TABLE(id uuid, company_id uuid, email_notifications boolean, whatsapp_notifications boolean, reminders_enabled boolean, confirmations_enabled boolean, online_booking_enabled boolean, online_payment_enabled boolean, advanced_reports_enabled boolean, whatsapp_integration_enabled boolean, primary_color text, secondary_color text, created_at timestamp with time zone, updated_at timestamp with time zone) AS $$
BEGIN
  -- Try to get existing settings
  RETURN QUERY
  SELECT cs.* FROM public.company_settings cs WHERE cs.company_id = company_uuid;
  
  -- If no settings found, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.company_settings (company_id)
    VALUES (company_uuid);
    
    RETURN QUERY
    SELECT cs.* FROM public.company_settings cs WHERE cs.company_id = company_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;