-- Add subscription date columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

-- Add comment to explain the columns
COMMENT ON COLUMN public.companies.subscription_start_date IS 'Date when the current subscription started';
COMMENT ON COLUMN public.companies.subscription_end_date IS 'Date when the current subscription ends';
COMMENT ON COLUMN public.companies.subscription_status IS 'Status of subscription: active, grace_period, expired, inactive';