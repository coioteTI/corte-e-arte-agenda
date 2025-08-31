-- Liberar acesso ao plano teste para usuário que fez pagamento
UPDATE companies 
SET plan = 'plano_teste', updated_at = now() 
WHERE email = 'elsantosel934@gmail.com';