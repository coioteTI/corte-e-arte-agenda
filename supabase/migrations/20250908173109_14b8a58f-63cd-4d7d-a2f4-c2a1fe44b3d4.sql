-- Adicionar constraint única para evitar agendamentos duplicados no mesmo horário
-- Isso vai prevenir que múltiplos agendamentos sejam criados para o mesmo profissional no mesmo horário

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_professional_datetime_unique 
UNIQUE (professional_id, appointment_date, appointment_time, status);