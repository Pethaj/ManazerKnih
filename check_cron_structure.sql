-- =====================================================
-- ZJIŠTĚNÍ STRUKTURY CRON TABULKY A OPRAVA
-- =====================================================

-- 1. Nejdříve zjistíme, jaké sloupce skutečně existují
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'cron' AND table_name = 'job'
ORDER BY ordinal_position;

-- 2. Zobrazíme všechny cron jobs s dostupnými sloupci
SELECT * FROM cron.job;

-- 3. Specificky náš job
SELECT * FROM cron.job WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%';

-- =====================================================
-- OPRAVA CRON JOB - VERZE PRO STARŠÍ SUPABASE
-- =====================================================

-- Odstraníme existující problematické jobs
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN 
        SELECT jobname FROM cron.job 
        WHERE jobname LIKE '%sync%' OR jobname LIKE '%product%'
    LOOP
        PERFORM cron.unschedule(job_record.jobname);
        RAISE NOTICE 'Odstraněn job: %', job_record.jobname;
    END LOOP;
END $$;

-- Vytvoříme nový, kompatibilní cron job
SELECT cron.schedule(
    'bewit-sync-daily',
    '0 6 * * *',
    $$
    DO $$
    BEGIN
        PERFORM net.http_post(
            'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
            '{}',
            'application/json',
            ARRAY[
                ('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'),
                ('Content-Type', 'application/json')
            ]::http_header[]
        );
        
        -- Zalogujeme, že cron job běžel
        INSERT INTO sync_logs (sync_type, status, started_at, feed_url)
        VALUES ('cron_triggered', 'success', NOW(), 'https://bewit.love/feeds/zbozi.xml');
    EXCEPTION WHEN OTHERS THEN
        -- Zalogujeme chybu
        INSERT INTO sync_logs (sync_type, status, started_at, error_message, feed_url)
        VALUES ('cron_triggered', 'error', NOW(), SQLERRM, 'https://bewit.love/feeds/zbozi.xml');
    END $$;
    $$
);

-- =====================================================
-- OVĚŘENÍ A KONTROLA
-- =====================================================

-- Zkontrolujeme vytvořený job
SELECT jobname, schedule FROM cron.job WHERE jobname = 'bewit-sync-daily';

-- Test manuálního spuštění
DO $$
BEGIN
    PERFORM net.http_post(
        'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
        '{}',
        'application/json',
        ARRAY[
            ('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG9wYWZ5YmVzbGJjcWp4c3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTM0MjEsImV4cCI6MjA3MDgyOTQyMX0.8gxL0b9flTUyoltiEIJx8Djuiyx16rySlffHkd_nm1U'),
            ('Content-Type', 'application/json')
        ]::http_header[]
    );
    
    INSERT INTO sync_logs (sync_type, status, started_at, feed_url)
    VALUES ('manual_test', 'success', NOW(), 'Manual test executed');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO sync_logs (sync_type, status, started_at, error_message, feed_url)
    VALUES ('manual_test', 'error', NOW(), SQLERRM, 'Manual test failed');
END $$;

-- Zkontrolujeme výsledky
SELECT 
    sync_type,
    status,
    started_at,
    error_message,
    'Posledních 5 záznamů' as note
FROM sync_logs 
ORDER BY started_at DESC 
LIMIT 5;
