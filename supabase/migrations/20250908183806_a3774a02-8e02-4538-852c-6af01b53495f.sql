-- Add unique constraint to prevent duplicate appointments on same time slot
ALTER TABLE appointments
ADD CONSTRAINT unique_appointment_slot 
UNIQUE (company_id, professional_id, appointment_date, appointment_time) 
WHERE status IN ('confirmed', 'scheduled', 'pending');