-- =====================================================
-- ALTERNATIVNÍ ŘEŠENÍ PRO AUTOMATICKOU SYNCHRONIZACI
-- =====================================================

-- ŘEŠENÍ 1: Jednodušší cron job bez složitých headers
SELECT cron.schedule(
    'simple-product-sync',
    '0 6 * * *',
    'SELECT ''Sync triggered at '' || NOW();'
);

-- ŘEŠENÍ 2: Použití Supabase Database Webhooks
-- Vytvoříme trigger, který se spustí v určitý čas
CREATE OR REPLACE FUNCTION trigger_product_sync()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Vytvoříme záznam, který spustí webhook
    INSERT INTO sync_triggers (trigger_type, triggered_at, status)
    VALUES ('daily_product_sync', NOW(), 'pending');
END;
$$;

-- Nastavíme cron job pro spuštění triggeru
SELECT cron.schedule(
    'trigger-product-sync',
    '0 6 * * *',
    'SELECT trigger_product_sync();'
);

-- ŘEŠENÍ 3: Vytvoříme tabulku pro sync triggery
CREATE TABLE IF NOT EXISTS sync_triggers (
    id SERIAL PRIMARY KEY,
    trigger_type TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    processed_at TIMESTAMP WITH TIME ZONE,
    response_data JSONB
);

-- ŘEŠENÍ 4: Manuální trigger pro okamžité testování
CREATE OR REPLACE FUNCTION manual_product_sync()
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    response_data JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    http_response JSONB;
    start_time TIMESTAMP;
    log_id INTEGER;
BEGIN
    start_time := NOW();
    
    -- Vytvoříme log záznam
    INSERT INTO sync_logs (sync_type, status, started_at, feed_url)
    VALUES ('manual_trigger', 'running', start_time, 'https://bewit.love/feeds/zbozi.xml')
    RETURNING id INTO log_id;
    
    -- Zavoláme Edge Function
    SELECT content::jsonb INTO http_response
    FROM http_post(
        'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
        '',
        'application/json',
        ARRAY[
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'),
            http_header('Content-Type', 'application/json')
        ]
    );
    
    -- Aktualizujeme log
    UPDATE sync_logs 
    SET 
        status = CASE WHEN http_response->>'ok' = 'true' THEN 'success' ELSE 'error' END,
        finished_at = NOW(),
        records_processed = COALESCE((http_response->>'processed')::INTEGER, 0),
        records_inserted = COALESCE((http_response->>'inserted')::INTEGER, 0),
        records_updated = COALESCE((http_response->>'updated')::INTEGER, 0),
        records_failed = COALESCE((http_response->>'failed')::INTEGER, 0)
    WHERE id = log_id;
    
    RETURN QUERY SELECT 
        COALESCE(http_response->>'ok' = 'true', false),
        'Synchronizace dokončena',
        http_response;
END;
$$;

-- =====================================================
-- TESTOVÁNÍ ALTERNATIVNÍCH ŘEŠENÍ
-- =====================================================

-- Test manuální funkce
SELECT * FROM manual_product_sync();

-- Kontrola všech cron jobs
SELECT 
    jobname,
    schedule, 
    active,
    last_run_start_time,
    last_run_status
FROM cron.job 
ORDER BY created_at DESC;

-- =====================================================
-- DENNÍ ZDRAVOTNÍ KONTROLA
-- =====================================================

-- Vytvoříme funkci pro denní kontrolu stavu
CREATE OR REPLACE FUNCTION daily_health_check()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Kontrola posledních synchronizací
    RETURN QUERY 
    SELECT 
        'Last Sync Check' as check_name,
        CASE 
            WHEN MAX(started_at) > NOW() - INTERVAL '25 hours' THEN 'OK'
            ELSE 'WARNING'
        END as status,
        'Last sync: ' || COALESCE(MAX(started_at)::TEXT, 'Never') as details
    FROM sync_logs 
    WHERE sync_type LIKE '%product%';
    
    -- Kontrola počtu produktů
    RETURN QUERY
    SELECT 
        'Product Count' as check_name,
        CASE 
            WHEN COUNT(*) > 2000 THEN 'OK'
            WHEN COUNT(*) > 1000 THEN 'WARNING'
            ELSE 'ERROR'
        END as status,
        'Total products: ' || COUNT(*)::TEXT as details
    FROM products;
    
    -- Kontrola cron jobs
    RETURN QUERY
    SELECT 
        'Cron Jobs' as check_name,
        CASE 
            WHEN COUNT(*) > 0 THEN 'OK'
            ELSE 'ERROR'
        END as status,
        'Active cron jobs: ' || COUNT(*)::TEXT as details
    FROM cron.job 
    WHERE active = true AND (jobname LIKE '%sync%' OR jobname LIKE '%product%');
END;
$$;

-- Spusťte zdravotní kontrolu
SELECT * FROM daily_health_check();
