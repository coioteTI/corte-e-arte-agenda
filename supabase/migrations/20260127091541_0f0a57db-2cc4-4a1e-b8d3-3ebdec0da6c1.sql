-- Fix the search_path for the push notification trigger function
ALTER FUNCTION public.trigger_push_notification_on_appointment() 
SET search_path = public;