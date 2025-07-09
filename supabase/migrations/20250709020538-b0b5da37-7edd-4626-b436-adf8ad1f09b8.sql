-- Create company_settings table to store all company configurations
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  
  -- Notification settings
  email_notifications BOOLEAN DEFAULT true,
  whatsapp_notifications BOOLEAN DEFAULT false,
  reminders_enabled BOOLEAN DEFAULT true,
  confirmations_enabled BOOLEAN DEFAULT true,
  
  -- System features
  online_booking_enabled BOOLEAN DEFAULT true,
  online_payment_enabled BOOLEAN DEFAULT false,
  advanced_reports_enabled BOOLEAN DEFAULT true,
  whatsapp_integration_enabled BOOLEAN DEFAULT false,
  
  -- Customization settings
  primary_color TEXT DEFAULT '#8B5CF6',
  secondary_color TEXT DEFAULT '#ffffff',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT company_settings_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT company_settings_company_id_unique 
    UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company owners can manage their settings" 
ON public.company_settings 
FOR ALL 
USING (company_id IN (
  SELECT companies.id 
  FROM companies 
  WHERE companies.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get or create company settings
CREATE OR REPLACE FUNCTION public.get_or_create_company_settings(company_uuid UUID)
RETURNS TABLE(
  id UUID,
  company_id UUID,
  email_notifications BOOLEAN,
  whatsapp_notifications BOOLEAN,
  reminders_enabled BOOLEAN,
  confirmations_enabled BOOLEAN,
  online_booking_enabled BOOLEAN,
  online_payment_enabled BOOLEAN,
  advanced_reports_enabled BOOLEAN,
  whatsapp_integration_enabled BOOLEAN,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;