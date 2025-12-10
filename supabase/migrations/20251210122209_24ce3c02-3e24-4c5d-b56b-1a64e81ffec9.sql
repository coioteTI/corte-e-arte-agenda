-- Create stock_categories table
CREATE TABLE public.stock_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_products table
CREATE TABLE public.stock_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.stock_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_categories
CREATE POLICY "Company owners can manage their stock categories"
ON public.stock_categories
FOR ALL
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- RLS policies for stock_products
CREATE POLICY "Company owners can manage their stock products"
ON public.stock_products
FOR ALL
USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_stock_categories_updated_at
BEFORE UPDATE ON public.stock_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_products_updated_at
BEFORE UPDATE ON public.stock_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();