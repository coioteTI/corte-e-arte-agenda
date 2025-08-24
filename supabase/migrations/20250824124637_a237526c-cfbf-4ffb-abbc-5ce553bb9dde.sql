-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the auto-complete appointments function to run every 5 minutes
SELECT cron.schedule(
  'auto-complete-appointments',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://gwyickztdeiplccievyt.supabase.co/functions/v1/auto-complete-appointments',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3eWlja3p0ZGVpcGxjY2lldnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDExOTYsImV4cCI6MjA2NzIxNzE5Nn0._cyV4DVT3LRVy6yI6ehO9zwgNlr3vsWYQt7-e5K4PyE"}'::jsonb,
        body:='{"timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);