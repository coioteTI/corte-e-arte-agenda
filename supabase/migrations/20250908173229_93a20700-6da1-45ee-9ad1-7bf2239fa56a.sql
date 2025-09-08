-- Primeiro, vamos identificar e remover agendamentos duplicados
-- Manter apenas o mais recente de cada grupo duplicado

WITH duplicates AS (
  SELECT 
    id,
    professional_id,
    appointment_date,
    appointment_time,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY professional_id, appointment_date, appointment_time, status 
      ORDER BY created_at DESC
    ) as rn
  FROM public.appointments
  WHERE status IN ('scheduled', 'confirmed', 'pending')
)
DELETE FROM public.appointments 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Agora adicionar a constraint única
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_professional_datetime_unique 
UNIQUE (professional_id, appointment_date, appointment_time);