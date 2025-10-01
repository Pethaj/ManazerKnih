-- =====================================================
-- VYČIŠTĚNÍ A OPRAVA CRON JOBS
-- =====================================================

-- 1. Nejdříve zkontrolujeme detaily obou jobs
SELECT 
    jobid,
    jobname,
    schedule,
    LEFT(command, 100) || '...' as command_preview,
    active,
    database,
    username
FROM cron.job 
WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%'
ORDER BY jobid;

-- 2. Odstraníme všechny existující sync jobs
SELECT cron.unschedule('sync-products-daily');
SELECT cron.unschedule('sync-bewit-products-daily');

-- Ověříme, že byly odstraněny
SELECT COUNT(*) as remaining_sync_jobs 
FROM cron.job 
WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%';

-- =====================================================
-- VYTVOŘENÍ JEDNOHO SPRÁVNÉHO CRON JOB
-- =====================================================

-- Vytvoříme jeden, správně nakonfigurovaný cron job
SELECT cron.schedule(
    'bewit-products-sync',           -- Jedinečný název
    '0 6 * * *',                    -- Každý den v 6:00 UTC (8:00 CEST)
    $$
    DO $$
    DECLARE
        response_data jsonb;
        log_id integer;
    BEGIN
        -- Vytvoříme log před spuštěním
        INSERT INTO sync_logs (
            sync_type, 
            status, 
            started_at, 
            feed_url,
            records_processed,
            records_inserted,
            records_updated,
            records_failed
        ) VALUES (
            'cron_auto_sync', 
            'running', 
            NOW(), 
            'https://bewit.love/feeds/zbozi.xml',
            0, 0, 0, 0
        ) RETURNING id INTO log_id;

        -- Zavoláme Edge Function
        SELECT content::jsonb INTO response_data
        FROM http_post(
            'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
            '',
            'application/json',
            ARRAY[
                http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'),
                http_header('Content-Type', 'application/json')
            ]
        );

        -- Aktualizujeme log s výsledkem
        UPDATE sync_logs SET
            status = CASE 
                WHEN response_data->>'ok' = 'true' THEN 'success' 
                ELSE 'error' 
            END,
            finished_at = NOW(),
            records_processed = COALESCE((response_data->>'processed')::integer, 0),
            records_inserted = COALESCE((response_data->>'inserted')::integer, 0),
            records_updated = COALESCE((response_data->>'updated')::integer, 0),
            records_failed = COALESCE((response_data->>'failed')::integer, 0),
            error_message = CASE 
                WHEN response_data->>'ok' != 'true' THEN response_data->>'error'
                ELSE NULL 
            END
        WHERE id = log_id;

    EXCEPTION WHEN OTHERS THEN
        -- V případě chyby aktualizujeme log
        UPDATE sync_logs SET
            status = 'error',
            finished_at = NOW(),
            error_message = 'Cron job error: ' || SQLERRM
        WHERE id = log_id;
    END $$;
    $$
);

-- =====================================================
-- OVĚŘENÍ A TEST
-- =====================================================

-- Zkontrolujeme nový job
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    'Nový cron job vytvořen' as status
FROM cron.job 
WHERE jobname = 'bewit-products-sync';

-- Okamžitý test Edge Function
SELECT content::jsonb as edge_function_response
FROM http_post(
    'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
    '',
    'application/json',
    ARRAY[
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'),
        http_header('Content-Type', 'application/json')
    ]
);

-- Zkontrolujeme posledních 5 sync logů
SELECT 
    sync_type,
    status,
    started_at,
    finished_at,
    records_processed,
    records_inserted,
    records_updated,
    records_failed,
    error_message
FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 5;

-- =====================================================
-- FINÁLNÍ KONTROLA
-- =====================================================

-- Zobrazíme finální stav
SELECT 
    'Cron Jobs' as category,
    COUNT(*) as count,
    STRING_AGG(jobname, ', ') as job_names
FROM cron.job 
WHERE active = true AND jobname LIKE '%bewit%'
UNION ALL
SELECT 
    'Dnešní synchronizace' as category,
    COUNT(*) as count,
    STRING_AGG(status, ', ') as statuses
FROM sync_logs 
WHERE DATE(started_at) = CURRENT_DATE AND sync_type LIKE '%product%'
UNION ALL
SELECT 
    'Celkový počet produktů' as category,
    COUNT(*) as count,
    'produktů v databázi' as info
FROM products;
