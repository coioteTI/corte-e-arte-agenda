-- Schedule daily password generation at midnight (BRT = UTC-3, so 3:00 UTC)
SELECT cron.schedule(
  'generate-super-admin-password-daily',
  '0 3 * * *', -- 3:00 UTC = 00:00 BRT
  $$
  SELECT
    net.http_post(
      url := 'https://gwyickztdeiplccievyt.supabase.co/functions/v1/generate-super-admin-password',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eWlja3p0ZGVpcGxjY2lldnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDExOTYsImV4cCI6MjA2NzIxNzE5Nn0._cyV4DVT3LRVy6yI6ehO9zwgNlr3vsWYQt7-e5K4PyE"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);