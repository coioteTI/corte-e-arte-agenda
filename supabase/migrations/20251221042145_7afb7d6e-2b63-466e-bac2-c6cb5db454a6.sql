-- Create table for professional salary payments
CREATE TABLE public.professional_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_reason TEXT NOT NULL,
  proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company owners
CREATE POLICY "Company owners can manage professional payments"
ON public.professional_payments
FOR ALL
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_professional_payments_updated_at
BEFORE UPDATE ON public.professional_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_professional_payments_company_id ON public.professional_payments(company_id);
CREATE INDEX idx_professional_payments_professional_id ON public.professional_payments(professional_id);
CREATE INDEX idx_professional_payments_date ON public.professional_payments(payment_date);