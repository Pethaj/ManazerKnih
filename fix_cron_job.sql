-- =====================================================
-- KONTROLA A OPRAVA CRON JOB PRO AUTOMATICKOU SYNCHRONIZACI
-- =====================================================

-- 1. Nejdříve zkontrolujeme všechny existující cron jobs
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    created_at,
    last_run_start_time,
    last_run_finish_time,
    last_run_status
FROM cron.job 
ORDER BY created_at DESC;

-- 2. Specificky zkontrolujeme náš cron job
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active,
    created_at
FROM cron.job 
WHERE jobname = 'sync-bewit-products-daily';

-- 3. Zkontrolujeme, zda je pg_cron rozšíření aktivní
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- =====================================================
-- OPRAVA: Odstraníme a znovu vytvoříme cron job
-- =====================================================

-- Odstraníme všechny existující sync jobs
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%';

-- Vytvoříme nový, správně nakonfigurovaný cron job
SELECT cron.schedule(
    'bewit-products-daily-sync',  -- Nový název
    '0 6 * * *',  -- Každý den v 6:00 UTC
    $$SELECT net.http_post(
        url := 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
        headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U", "Content-Type": "application/json"}'::jsonb
    );$$
);

-- =====================================================
-- OVĚŘENÍ A TEST
-- =====================================================

-- Ověříme, že nový cron job byl vytvořen správně
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    created_at,
    'Job vytvořen úspěšně' as status
FROM cron.job 
WHERE jobname = 'bewit-products-daily-sync';

-- Test okamžitého spuštění (volitelné)
SELECT net.http_post(
    url := 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U", "Content-Type": "application/json"}'::jsonb
) as test_response;

-- Zkontrolujeme výsledek testu a případné logy
SELECT 
    sync_type,
    status,
    started_at,
    finished_at,
    records_processed,
    records_inserted,
    records_updated,
    error_message
FROM sync_logs 
WHERE started_at > NOW() - INTERVAL '10 minutes'
ORDER BY started_at DESC
LIMIT 3;
