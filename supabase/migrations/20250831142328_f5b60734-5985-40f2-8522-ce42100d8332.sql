-- Remover barbearia duplicada/clonada
DELETE FROM companies 
WHERE id = '0ce0ee25-247e-4f3a-bd5c-f8866cdfc584' 
AND email = 'elizeu.santos@aluno.faculdadeimpacta.com.br';

-- Atualizar agendamentos que não têm total_price definido
UPDATE appointments 
SET total_price = (
    SELECT COALESCE(s.promotional_price, s.price) 
    FROM services s 
    WHERE s.id = appointments.service_id
)
WHERE total_price IS NULL 
AND service_id IS NOT NULL;