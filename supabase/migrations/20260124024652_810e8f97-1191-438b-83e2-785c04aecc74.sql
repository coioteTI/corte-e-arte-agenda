-- Tabela de Fornecedores
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Company owners can manage their suppliers"
ON public.suppliers
FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Tabela de Produtos por Fornecedor (com preço de compra/venda)
CREATE TABLE public.supplier_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.stock_products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Company owners can manage their supplier products"
ON public.supplier_products
FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Tabela de Gastos
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_product_id UUID REFERENCES public.supplier_products(id) ON DELETE SET NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Company owners can manage their expenses"
ON public.expenses
FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at
BEFORE UPDATE ON public.supplier_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_suppliers_company_id ON public.suppliers(company_id);
CREATE INDEX idx_supplier_products_company_id ON public.supplier_products(company_id);
CREATE INDEX idx_supplier_products_supplier_id ON public.supplier_products(supplier_id);
CREATE INDEX idx_expenses_company_id ON public.expenses(company_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);