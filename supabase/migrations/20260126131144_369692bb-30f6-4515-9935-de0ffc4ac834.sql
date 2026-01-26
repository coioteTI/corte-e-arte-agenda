-- Create a policy to allow public read access to module_settings for the agendamento_publico module
CREATE POLICY "Public can view agendamento_publico setting"
ON public.module_settings
FOR SELECT
USING (module_key = 'agendamento_publico');