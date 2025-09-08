-- Create a unique partial index to prevent duplicate appointments for active statuses
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_slot 
ON appointments (company_id, professional_id, appointment_date, appointment_time) 
WHERE status IN ('confirmed', 'scheduled', 'pending');