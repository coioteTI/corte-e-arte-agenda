-- Add business hours columns to companies table
ALTER TABLE public.companies 
ADD COLUMN business_hours JSONB DEFAULT '{
  "monday": {"isOpen": true, "start": "08:00", "end": "18:00"},
  "tuesday": {"isOpen": true, "start": "08:00", "end": "18:00"},
  "wednesday": {"isOpen": true, "start": "08:00", "end": "18:00"},
  "thursday": {"isOpen": true, "start": "08:00", "end": "18:00"},
  "friday": {"isOpen": true, "start": "08:00", "end": "18:00"},
  "saturday": {"isOpen": true, "start": "08:00", "end": "18:00"},
  "sunday": {"isOpen": false, "start": "08:00", "end": "18:00"}
}'::jsonb;