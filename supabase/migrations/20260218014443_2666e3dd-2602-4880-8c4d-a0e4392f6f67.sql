-- Schedule daily birthday check at 9 AM UTC
SELECT cron.schedule(
  'whatsapp-birthday-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gwyickztdeiplccievyt.supabase.co/functions/v1/whatsapp-birthday',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eWlja3p0ZGVpcGxjY2lldnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDExOTYsImV4cCI6MjA2NzIxNzE5Nn0._cyV4DVT3LRVy6yI6ehO9zwgNlr3vsWYQt7-e5K4PyE"}'::jsonb,
        body:='{"time": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);