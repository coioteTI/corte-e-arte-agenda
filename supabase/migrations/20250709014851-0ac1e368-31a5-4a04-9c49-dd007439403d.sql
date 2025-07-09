-- Add promotion fields to services table
ALTER TABLE public.services 
ADD COLUMN is_promotion BOOLEAN DEFAULT FALSE,
ADD COLUMN promotional_price NUMERIC,
ADD COLUMN promotion_valid_until DATE;

-- Create function to get company rankings by appointments count
CREATE OR REPLACE FUNCTION public.get_company_rankings_by_appointments()
RETURNS TABLE(
  id UUID,
  name TEXT,
  appointments_count BIGINT,
  ranking BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(a.appointments_count, 0) as appointments_count,
    ROW_NUMBER() OVER (ORDER BY COALESCE(a.appointments_count, 0) DESC) as ranking
  FROM public.companies c
  LEFT JOIN (
    SELECT 
      company_id,
      COUNT(*) as appointments_count
    FROM public.appointments
    WHERE 
      status IN ('scheduled', 'confirmed', 'completed')
      AND appointment_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND appointment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY company_id
  ) a ON c.id = a.company_id
  ORDER BY appointments_count DESC;
END;
$$;