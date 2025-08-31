-- Remove duplicate barbershops, keeping only the oldest one
-- Delete duplicate "Barbearia do João" records, keeping the first one created

DELETE FROM public.companies 
WHERE name = 'Barbearia do João' 
  AND city = 'Jandira' 
  AND state = 'São Paulo'
  AND id NOT IN (
    SELECT id 
    FROM public.companies 
    WHERE name = 'Barbearia do João' 
      AND city = 'Jandira' 
      AND state = 'São Paulo'
    ORDER BY created_at ASC 
    LIMIT 1
  );