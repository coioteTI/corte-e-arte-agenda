-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('employee', 'admin', 'ceo');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create branches (filiais) table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create user_branches table (which branches a user can access)
CREATE TABLE public.user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

-- Enable RLS on user_branches
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

-- Create branch_session table to track current user session branch
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Add branch_id to existing tables (companies becomes the main/owner entity)
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.stock_products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.stock_categories ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.stock_sales ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.professional_payments ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Security definer function to check user role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'ceo' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'employee' THEN 3 
    END
  LIMIT 1
$$;

-- Function to check if user has access to a branch
CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- CEO has access to all branches
      WHEN public.has_role(_user_id, 'ceo') THEN true
      -- Others need explicit branch assignment
      ELSE EXISTS (
        SELECT 1
        FROM public.user_branches
        WHERE user_id = _user_id
          AND branch_id = _branch_id
      )
    END
$$;

-- Function to get current user's session branch
CREATE OR REPLACE FUNCTION public.get_current_branch(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_branch_id
  FROM public.user_sessions
  WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "CEOs can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "Admins can view roles in their branches"
  ON public.user_roles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'ceo')
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can create employee roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') AND role = 'employee')
    OR public.has_role(auth.uid(), 'ceo')
  );

-- RLS Policies for branches
CREATE POLICY "All authenticated users can view active branches"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'ceo'));

CREATE POLICY "CEOs can manage branches"
  ON public.branches
  FOR ALL
  USING (public.has_role(auth.uid(), 'ceo'));

-- RLS Policies for user_branches
CREATE POLICY "Users can view their own branch assignments"
  ON public.user_branches
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CEOs and Admins can manage branch assignments"
  ON public.user_branches
  FOR ALL
  USING (public.has_role(auth.uid(), 'ceo') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_sessions
CREATE POLICY "Users can manage their own session"
  ON public.user_sessions
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "CEOs can view all sessions"
  ON public.user_sessions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'ceo'));

-- Create indices for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_branches_user_id ON public.user_branches(user_id);
CREATE INDEX idx_user_branches_branch_id ON public.user_branches(branch_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_professionals_branch_id ON public.professionals(branch_id);
CREATE INDEX idx_services_branch_id ON public.services(branch_id);
CREATE INDEX idx_appointments_branch_id ON public.appointments(branch_id);
CREATE INDEX idx_clients_branch_id ON public.clients(branch_id);