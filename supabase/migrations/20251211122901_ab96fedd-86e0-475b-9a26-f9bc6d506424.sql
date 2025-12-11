-- Tabela de vendas de produtos do estoque
CREATE TABLE public.stock_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.stock_products(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para consultas rápidas
CREATE INDEX idx_stock_sales_company_id ON public.stock_sales(company_id);
CREATE INDEX idx_stock_sales_client_id ON public.stock_sales(client_id);
CREATE INDEX idx_stock_sales_sold_at ON public.stock_sales(sold_at);
CREATE INDEX idx_stock_sales_payment_status ON public.stock_sales(payment_status);

-- Enable RLS
ALTER TABLE public.stock_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company owners can manage their stock sales"
  ON public.stock_sales
  FOR ALL
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_stock_sales_updated_at
  BEFORE UPDATE ON public.stock_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();