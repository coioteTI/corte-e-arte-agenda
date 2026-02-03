-- Add branch limit and blocking columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS branch_limit integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Create index for faster queries on blocked status
CREATE INDEX IF NOT EXISTS idx_companies_is_blocked ON public.companies(is_blocked);

-- Create function to check if company can create more branches
CREATE OR REPLACE FUNCTION public.can_create_branch(company_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  -- Get current branch count
  SELECT COUNT(*) INTO current_count
  FROM public.branches
  WHERE company_id = company_uuid AND is_active = true;
  
  -- Get company's branch limit
  SELECT COALESCE(branch_limit, 5) INTO max_limit
  FROM public.companies
  WHERE id = company_uuid;
  
  RETURN current_count < max_limit;
END;
$$;

-- Create function to check if company is blocked
CREATE OR REPLACE FUNCTION public.is_company_blocked(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_blocked, false)
  FROM public.companies
  WHERE id = company_uuid;
$$;