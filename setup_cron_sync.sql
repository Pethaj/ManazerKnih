-- =====================================================
-- KONTROLA A NASTAVENÍ AUTOMATICKÉ SYNCHRONIZACE PRODUKTŮ
-- =====================================================

-- 1. Kontrola existujících cron jobs
SELECT 
    jobname,
    schedule,
    command,
    active,
    last_run_start_time,
    last_run_finish_time,
    last_run_status
FROM cron.job 
WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%' OR command LIKE '%sync-products%'
ORDER BY jobname;

-- 2. Kontrola dnešních synchronizací
SELECT 
    COUNT(*) as today_syncs,
    MAX(started_at) as last_sync_today
FROM sync_logs 
WHERE sync_type LIKE '%products%' 
AND DATE(started_at) = CURRENT_DATE;

-- 3. Posledních 5 synchronizací
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
WHERE sync_type LIKE '%products%'
ORDER BY started_at DESC 
LIMIT 5;

-- =====================================================
-- NASTAVENÍ CRON JOB PRO AUTOMATICKOU SYNCHRONIZACI
-- =====================================================

-- Pokud cron job neexistuje, vytvoříme ho:
-- POZOR: Spusťte pouze pokud cron job neexistuje!

-- Odstraníme existující job se stejným názvem (pokud existuje)
SELECT cron.unschedule('sync-bewit-products-daily');

-- Vytvoříme nový cron job pro denní synchronizaci v 6:00 ráno
SELECT cron.schedule(
    'sync-bewit-products-daily',
    '0 6 * * *',  -- Každý den v 6:00 UTC (8:00 CEST v létě, 7:00 CET v zimě)
    'SELECT net.http_post(
        url := ''https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products'',
        headers := jsonb_build_object(
            ''Authorization'', ''Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'',
            ''Content-Type'', ''application/json''
        )
    );'
);

-- Ověříme, že cron job byl vytvořen
SELECT 
    jobname,
    schedule,
    active,
    created_at
FROM cron.job 
WHERE jobname = 'sync-bewit-products-daily';

-- =====================================================
-- MANUÁLNÍ TEST SYNCHRONIZACE
-- =====================================================

-- Test manuálního spuštění (pokud chcete otestovat hned):
/*
SELECT net.http_post(
    url := 'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
    headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U',
        'Content-Type', 'application/json'
    )
);
*/

-- =====================================================
-- POMOCNÉ DOTAZY PRO MONITORING
-- =====================================================

-- Zobrazení statistik produktů
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN last_sync_at > CURRENT_DATE THEN 1 END) as synced_today,
    MAX(last_sync_at) as last_product_sync
FROM products;

-- Zobrazení chyb v synchronizaci za posledních 7 dní
SELECT 
    DATE(started_at) as sync_date,
    COUNT(*) as total_syncs,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as failed
FROM sync_logs 
WHERE sync_type LIKE '%products%'
AND started_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY sync_date DESC;

-- =====================================================
-- INSTRUKCE PRO SPUŠTĚNÍ
-- =====================================================

/*
POSTUP:

1. Zkopírujte tento SQL do Supabase SQL editoru
2. Spusťte první část (kontroly) pro zjištění současného stavu
3. Pokud cron job neexistuje, spusťte část pro vytvoření cron job
4. Ověřte výsledek pomocí kontrolních dotazů

ČASOVÉ NASTAVENÍ:
- Cron '0 6 * * *' = každý den v 6:00 UTC
- V České republice to znamená:
  - 8:00 v létě (CEST = UTC+2) 
  - 7:00 v zimě (CET = UTC+1)

MOŽNÉ ALTERNATIVY ČASU:
- '0 5 * * *' = 5:00 UTC (7:00/6:00 CET/CEST)
- '0 7 * * *' = 7:00 UTC (9:00/8:00 CET/CEST) 
- '0 4 * * *' = 4:00 UTC (6:00/5:00 CET/CEST)

Pro změnu času upravte schedule v cron.schedule().
*/
