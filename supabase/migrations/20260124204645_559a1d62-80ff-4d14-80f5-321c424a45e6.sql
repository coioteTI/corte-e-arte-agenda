-- Adicionar coluna branch_id às tabelas de fornecedores para isolamento por filial

-- Adicionar branch_id à tabela suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Adicionar branch_id à tabela supplier_products
ALTER TABLE public.supplier_products 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Adicionar branch_id à tabela expenses (se ainda não existir)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON public.suppliers(branch_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_branch_id ON public.supplier_products(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses(branch_id);