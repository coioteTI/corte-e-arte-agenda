-- Add professional_responsible column to services table
ALTER TABLE public.services 
ADD COLUMN professional_responsible TEXT;

-- Update existing services to allow null values
-- This column will store the name of the responsible professional for each service