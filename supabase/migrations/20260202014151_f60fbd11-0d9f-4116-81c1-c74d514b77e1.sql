-- Add super_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create table for storing daily dynamic passwords
CREATE TABLE public.super_admin_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash text NOT NULL,
  valid_from timestamp with time zone NOT NULL DEFAULT now(),
  valid_until timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_passwords ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (via edge functions)
CREATE POLICY "Service role only for super_admin_passwords"
ON public.super_admin_passwords
FOR ALL
USING (false)
WITH CHECK (false);

-- Create table for super admin sessions/audit log
CREATE TABLE public.super_admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only for super_admin_audit_log"
ON public.super_admin_audit_log
FOR ALL
USING (false)
WITH CHECK (false);

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email = 'corteearte.suporte@gmail.com'
$$;

-- Create function to validate super admin password
CREATE OR REPLACE FUNCTION public.validate_super_admin_password(password_input text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
  is_valid boolean := false;
BEGIN
  -- Get the current valid password hash
  SELECT password_hash INTO stored_hash
  FROM public.super_admin_passwords
  WHERE now() BETWEEN valid_from AND valid_until
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Compare hashes (password_input should already be hashed on client side)
  IF stored_hash IS NOT NULL AND stored_hash = password_input THEN
    is_valid := true;
    
    -- Mark password as used
    UPDATE public.super_admin_passwords
    SET is_used = true, used_at = now()
    WHERE password_hash = stored_hash;
  END IF;
  
  RETURN is_valid;
END;
$$;