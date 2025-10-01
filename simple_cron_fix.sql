-- =====================================================
-- JEDNODUCHÉ A FUNKČNÍ ŘEŠENÍ CRON JOB
-- =====================================================

-- 1. Odstraníme všechny existující sync jobs
SELECT cron.unschedule('sync-products-daily');
SELECT cron.unschedule('sync-bewit-products-daily');

-- Ověříme, že byly odstraněny
SELECT 'Odstraněno jobs:' as status, COUNT(*) as remaining_jobs
FROM cron.job 
WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%';

-- =====================================================
-- VYTVOŘENÍ JEDNODUCHÉHO CRON JOB
-- =====================================================

-- Vytvoříme velmi jednoduchý cron job
SELECT cron.schedule(
    'bewit-daily-sync',
    '0 6 * * *',
    'SELECT net.http_post(''https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products'', '''', ''application/json'');'
);

-- =====================================================
-- OVĚŘENÍ
-- =====================================================

-- Zkontrolujeme nový job
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    'SUCCESS: Cron job vytvořen' as status
FROM cron.job 
WHERE jobname = 'bewit-daily-sync';

-- =====================================================
-- OKAMŽITÝ TEST
-- =====================================================

-- Test Edge Function
SELECT net.http_post(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products', 
    '', 
    'application/json'
) as test_response;

-- Zkontrolujeme výsledek v sync_logs
SELECT 
    sync_type,
    status,
    started_at,
    records_processed,
    records_inserted,
    records_updated,
    'Posledních 3 synchronizací' as note
FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 3;
