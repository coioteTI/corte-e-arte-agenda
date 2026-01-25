-- Add company_id to branches table to link branches to companies
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches(company_id);

-- Create a helper function to get company_id for any user (owner or employee)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First try to get company where user is the owner
  SELECT id FROM public.companies WHERE user_id = _user_id
  UNION
  -- Then try to get company through branch association
  SELECT b.company_id 
  FROM public.user_branches ub
  JOIN public.branches b ON b.id = ub.branch_id
  WHERE ub.user_id = _user_id AND b.company_id IS NOT NULL
  LIMIT 1
$$;