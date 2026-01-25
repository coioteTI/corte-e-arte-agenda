-- Update existing branches with correct company_id based on name pattern
UPDATE public.branches b
SET company_id = c.id
FROM public.companies c
WHERE b.company_id IS NULL
AND b.name LIKE c.name || '%';

-- For any remaining branches without company_id, try to match via user_branches
UPDATE public.branches b
SET company_id = c.id
FROM public.user_branches ub
JOIN public.user_roles ur ON ub.user_id = ur.user_id AND ur.role = 'ceo'
JOIN public.companies c ON c.user_id = ur.user_id
WHERE b.id = ub.branch_id
AND b.company_id IS NULL;