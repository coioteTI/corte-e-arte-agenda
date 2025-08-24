-- Remove "Barbearia do Elizeu" completely from the database
-- No related records exist in other tables, so safe to delete directly

DELETE FROM companies 
WHERE id = 'fbf8ede3-19d8-424b-a066-0462abee435d' 
AND name = 'Barbearia do Elizeu';