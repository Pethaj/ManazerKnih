-- =====================================================
-- MANUÁLNÍ TRIGGER ŘEŠENÍ (ZÁLOHA)
-- =====================================================

-- Pokud cron job nefunguje, vytvoříme manuální trigger systém

-- 1. Vytvoříme tabulku pro denní triggery
CREATE TABLE IF NOT EXISTS daily_sync_status (
    sync_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    last_sync_at TIMESTAMP,
    sync_count INTEGER DEFAULT 0,
    last_status TEXT DEFAULT 'pending'
);

-- 2. Vytvoříme funkci pro manuální spuštění
CREATE OR REPLACE FUNCTION manual_daily_sync()
RETURNS TABLE(
    message TEXT,
    sync_result JSONB,
    execution_time TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    response_text TEXT;
    response_json JSONB;
BEGIN
    start_time := NOW();
    
    -- Zaznamenáme pokus
    INSERT INTO daily_sync_status (sync_date, last_sync_at, sync_count, last_status)
    VALUES (CURRENT_DATE, NOW(), 1, 'running')
    ON CONFLICT (sync_date) 
    DO UPDATE SET 
        last_sync_at = NOW(), 
        sync_count = daily_sync_status.sync_count + 1,
        last_status = 'running';
    
    -- Zavoláme Edge Function
    SELECT content INTO response_text
    FROM net.http_post(
        'https://modopafybeslbcqjxsve.supabase.co/functions/v1/sync-products',
        '',
        'application/json'
    );
    
    -- Parsujeme odpověď
    BEGIN
        response_json := response_text::JSONB;
    EXCEPTION WHEN OTHERS THEN
        response_json := jsonb_build_object('error', 'Invalid JSON response', 'raw', response_text);
    END;
    
    -- Aktualizujeme stav
    UPDATE daily_sync_status 
    SET last_status = CASE 
        WHEN response_json->>'ok' = 'true' THEN 'success'
        ELSE 'error'
    END
    WHERE sync_date = CURRENT_DATE;
    
    RETURN QUERY SELECT 
        'Synchronizace dokončena' as message,
        response_json as sync_result,
        (EXTRACT(EPOCH FROM (NOW() - start_time)) || ' sekund')::TEXT as execution_time;
END;
$$;

-- =====================================================
-- OKAMŽITÉ SPUŠTĚNÍ
-- =====================================================

-- Spustíme synchronizaci HNED
SELECT * FROM manual_daily_sync();

-- Zkontrolujeme stav
SELECT 
    sync_date,
    last_sync_at,
    sync_count,
    last_status,
    'Dnešní stav synchronizace' as note
FROM daily_sync_status 
WHERE sync_date = CURRENT_DATE;

-- =====================================================
-- INSTRUKCE PRO DENNÍ POUŽITÍ
-- =====================================================

/*
DENNÍ POSTUP:

1. Každé ráno spusťte:
   SELECT * FROM manual_daily_sync();

2. Pro kontrolu stavu:
   SELECT * FROM daily_sync_status WHERE sync_date = CURRENT_DATE;

3. Pro historii:
   SELECT * FROM daily_sync_status ORDER BY sync_date DESC LIMIT 7;

AUTOMATIZACE:
- Přidejte si do kalendáře denní připomínku
- Nebo vytvořte si záložku v prohlížeči
- Případně si nastavte alarm na mobilu

JEDEN PŘÍKAZ PRO VŠE:
SELECT * FROM manual_daily_sync();
*/
