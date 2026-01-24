-- Add is_first_access column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN NOT NULL DEFAULT true;

-- Update existing profiles to mark them as NOT first access (they already have passwords)
UPDATE public.profiles SET is_first_access = false WHERE is_first_access = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.is_first_access IS 'Indicates if user needs to create password on first login';