-- Add function to increment likes count
CREATE OR REPLACE FUNCTION public.increment_likes(company_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.companies 
  SET likes_count = likes_count + 1 
  WHERE id = company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get company rankings
CREATE OR REPLACE FUNCTION public.get_company_rankings()
RETURNS TABLE (
  id UUID,
  name TEXT,
  likes_count INTEGER,
  ranking INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- 'confirmation', 'reminder', 'whatsapp', 'email'
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notification templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners can manage notification templates" ON public.notification_templates
FOR ALL USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Create trigger for notification templates
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();