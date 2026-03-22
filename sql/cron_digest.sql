-- Enable pg_cron extension if not already enabled (Requires SUPERUSER privileges in some environments)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the function that will be scheduled by pg_cron
-- This function will call a backend endpoint to trigger the digest agent
-- Alternatively, if running totally within backend, pg_cron can insert a trigger record.
-- However, since the architecture specifies triggering DigestAgent via pg_cron,
-- we'll use pg_net (supabase/http) to trigger the backend API from Postgres, or 
-- rely on a simple cron record table that a backend worker polls.
-- Assuming standard HTTP trigger if pg_net is available:

-- First ensure pg_net extension is available for HTTP requests
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job to run every Monday at 9:00 AM (0 9 * * 1)
-- Adjust the URL to your actual backend production / internal URL
SELECT cron.schedule(
    'weekly-progress-digest',  -- Job Name
    '0 9 * * 1',               -- Cron Schedule (Every Monday 9 AM)
    $$
    -- Example HTTP POST to the backend (requires pg_net or http extension)
    -- SELECT http_post('http://backend:8000/api/preferences/trigger-weekly-digest', '', 'application/json');
    
    -- If using Supabase / pg_net:
    -- SELECT net.http_post(
    --     url:='http://backend:8000/api/preferences/trigger-weekly-digest',
    --     headers:='{"Content-Type": "application/json"}'::jsonb
    -- );
    
    -- We'll log the execution for audit puposes
    INSERT INTO _db_error (message) VALUES ('Weekly digest cron triggered');
    $$
);

-- Note: The exact HTTP function depends on your specific PostgreSQL setup (pg_net vs pgsql-http).
-- The job can be monitored in the cron.job_run_details table.
