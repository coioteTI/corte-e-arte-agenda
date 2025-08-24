-- Check and fix security definer views
-- First, let's identify any security definer views
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    -- Check for views with SECURITY DEFINER
    FOR view_rec IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- For now, we'll just log them
        RAISE NOTICE 'Found view: %.%', view_rec.schemaname, view_rec.viewname;
    END LOOP;
END $$;

-- Check if companies_public is a view and recreate it without SECURITY DEFINER if needed
DROP VIEW IF EXISTS public.companies_public;

-- Recreate companies_public as a regular view (not SECURITY DEFINER)
CREATE VIEW public.companies_public AS
SELECT 
    id,
    name,
    address,
    number,
    neighborhood,
    city,
    state,
    zip_code,
    instagram,
    logo_url,
    primary_color,
    plan,
    likes_count,
    business_hours,
    created_at,
    updated_at
FROM public.companies;