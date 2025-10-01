-- =====================================================
-- JEDNODUCHÉ ZÁLOŽNÍ ŘEŠENÍ - TRIGGER TABULKA
-- =====================================================

-- Vytvoříme jednoduchou tabulku pro triggery
CREATE TABLE IF NOT EXISTS daily_sync_trigger (
    id SERIAL PRIMARY KEY,
    trigger_date DATE DEFAULT CURRENT_DATE,
    sync_requested_at TIMESTAMP DEFAULT NOW(),
    sync_completed_at TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

-- Vytvoříme funkci pro automatickou synchronizaci
CREATE OR REPLACE FUNCTION auto_sync_products()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    today_trigger INTEGER;
BEGIN
    -- Zkontrolujeme, zda už dnes proběhla synchronizace
    SELECT COUNT(*) INTO today_trigger
    FROM daily_sync_trigger 
    WHERE trigger_date = CURRENT_DATE AND status = 'completed';
    
    -- Pokud ne, spustíme synchronizaci
    IF today_trigger = 0 THEN
        -- Vložíme trigger záznam
        INSERT INTO daily_sync_trigger (trigger_date, status)
        VALUES (CURRENT_DATE, 'running');
        
        -- Zavoláme Edge Function pomocí jednoduchého HTTP požadavku
        PERFORM net.http_post(
            'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
            NULL,
            'application/json'
        );
        
        -- Označíme jako dokončeno
        UPDATE daily_sync_trigger 
        SET status = 'completed', sync_completed_at = NOW()
        WHERE trigger_date = CURRENT_DATE AND status = 'running';
    END IF;
END;
$$;

-- Vytvoříme velmi jednoduchý cron job
SELECT cron.schedule('daily-auto-sync', '0 6 * * *', 'SELECT auto_sync_products();');

-- =====================================================
-- OKAMŽITÝ TEST
-- =====================================================

-- Test funkce
SELECT auto_sync_products();

-- Kontrola výsledku
SELECT * FROM daily_sync_trigger ORDER BY sync_requested_at DESC LIMIT 3;

-- Kontrola sync logů
SELECT 
    sync_type,
    status, 
    started_at,
    records_processed,
    records_inserted,
    records_updated
FROM sync_logs 
WHERE started_at > NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC;

-- =====================================================
-- MANUÁLNÍ SPUŠTĚNÍ PRO DNEŠEK
-- =====================================================

-- Pokud chcete spustit synchronizaci hned teď
DELETE FROM daily_sync_trigger WHERE trigger_date = CURRENT_DATE;
SELECT auto_sync_products();
