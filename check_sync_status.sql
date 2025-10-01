-- Kontrola posledních synchronizací produktů
SELECT 
    sync_type,
    status,
    started_at,
    finished_at,
    records_processed,
    records_inserted,
    records_updated,
    records_failed,
    error_message,
    DATE(started_at) as sync_date
FROM sync_logs 
WHERE sync_type LIKE '%products%'
ORDER BY started_at DESC 
LIMIT 10;

-- Kontrola dnešních synchronizací
SELECT 
    COUNT(*) as today_syncs,
    MAX(started_at) as last_sync_today
FROM sync_logs 
WHERE sync_type LIKE '%products%' 
AND DATE(started_at) = CURRENT_DATE;

-- Kontrola pg_cron jobs (pokud existuje pg_cron extension)
SELECT 
    jobname,
    schedule,
    command,
    active,
    last_run_start_time,
    last_run_finish_time,
    last_run_status
FROM cron.job 
WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%'
ORDER BY jobname;
