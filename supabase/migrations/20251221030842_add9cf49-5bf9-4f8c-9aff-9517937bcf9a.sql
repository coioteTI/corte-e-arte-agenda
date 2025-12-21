-- Delete related data first, then the company
DELETE FROM likes WHERE target_type = 'company' AND target_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM favorites WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM appointments WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM services WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM professionals WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM gallery WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM notification_templates WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM company_settings WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM subscriptions WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM reviews WHERE company_id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';
DELETE FROM companies WHERE id = '6c64ab1f-3fa4-492a-9bbd-4c75046b3deb';