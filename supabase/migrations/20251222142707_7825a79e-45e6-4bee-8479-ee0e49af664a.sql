-- Enable REPLICA IDENTITY FULL for module_settings to support realtime updates
ALTER TABLE public.module_settings REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_settings;