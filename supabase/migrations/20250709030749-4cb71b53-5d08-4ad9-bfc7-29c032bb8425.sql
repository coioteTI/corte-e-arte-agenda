-- Limpar dados fictícios da empresa específica
DELETE FROM services WHERE company_id = '3b0caf98-f95f-4ad5-bb50-31231427997d';
DELETE FROM professionals WHERE company_id = '3b0caf98-f95f-4ad5-bb50-31231427997d';

-- Limpar dados da empresa para deixar em branco  
UPDATE companies 
SET 
  name = '',
  phone = '',
  address = '',
  city = '',
  state = '',
  neighborhood = '',
  number = '',
  zip_code = '',
  logo_url = null
WHERE id = '3b0caf98-f95f-4ad5-bb50-31231427997d';