-- Inserir serviços para a Barbearia do jã 3
INSERT INTO services (company_id, name, description, price, duration) VALUES
('1c004fdb-743f-4575-b2cf-b5da42b9fc87', 'Corte Masculino', 'Corte de cabelo masculino tradicional', 25.00, 30),
('1c004fdb-743f-4575-b2cf-b5da42b9fc87', 'Barba', 'Aparar e modelar barba', 15.00, 20),
('1c004fdb-743f-4575-b2cf-b5da42b9fc87', 'Corte + Barba', 'Pacote completo: corte de cabelo + barba', 35.00, 45),
('1c004fdb-743f-4575-b2cf-b5da42b9fc87', 'Sobrancelha', 'Design de sobrancelha masculina', 10.00, 15);

-- Inserir profissionais para a Barbearia do jã 3
INSERT INTO professionals (company_id, name, specialty, email, phone, is_available) VALUES
('1c004fdb-743f-4575-b2cf-b5da42b9fc87', 'João Silva', 'Cortes Modernos', 'joao@barbeariaja3.com', '11987654321', true),
('1c004fdb-743f-4575-b2cf-b5da42b9fc87', 'Pedro Santos', 'Barbeiro Tradicional', 'pedro@barbeariaja3.com', '11987654322', true);