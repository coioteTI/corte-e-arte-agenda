-- Create a function to trigger push notification on new appointment
CREATE OR REPLACE FUNCTION public.trigger_push_notification_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_service_name TEXT;
  v_formatted_time TEXT;
  v_formatted_date TEXT;
BEGIN
  -- Get client name
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  
  -- Get service name
  SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
  
  -- Format time
  v_formatted_time := TO_CHAR(NEW.appointment_time, 'HH24:MI');
  
  -- Format date
  v_formatted_date := TO_CHAR(NEW.appointment_date, 'DD/MM');
  
  -- Call the push notification edge function via pg_net (if available)
  -- This is a best-effort notification - won't block the insert
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/trigger-appointment-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'record', jsonb_build_object(
          'id', NEW.id,
          'company_id', NEW.company_id,
          'branch_id', NEW.branch_id,
          'client_id', NEW.client_id,
          'service_id', NEW.service_id,
          'appointment_date', NEW.appointment_date,
          'appointment_time', NEW.appointment_time
        )
      )
    );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION public.trigger_push_notification_on_appointment() IS 'Triggers a push notification to the company owner when a new appointment is created';

-- Note: The actual trigger creation depends on pg_net being available
-- If pg_net is not available, notifications will still work via the existing realtime subscription