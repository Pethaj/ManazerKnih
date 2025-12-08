-- SQL script pro přidání pole webhook_url přes PostgreSQL funkci
-- Tento přístup umožňuje spuštění DDL příkazů přes RPC

-- KROK 1: Vytvoř PostgreSQL funkci pro přidání sloupce
CREATE OR REPLACE FUNCTION add_webhook_url_column()
RETURNS TEXT AS $$
BEGIN
    -- Přidání sloupce webhook_url
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'chatbot_settings' 
        AND column_name = 'webhook_url'
    ) THEN
        ALTER TABLE public.chatbot_settings 
        ADD COLUMN webhook_url TEXT;
        
        RETURN 'Sloupec webhook_url byl úspěšně přidán';
    ELSE
        RETURN 'Sloupec webhook_url již existuje';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- KROK 2: Spusť funkci
SELECT add_webhook_url_column();

-- KROK 3: Nastav webhook URL pro Wany.Chat
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
    updated_at = NOW()
WHERE chatbot_id = 'vany_chat';

-- KROK 4: Nastav webhook URL pro Sana Local Format (výchozí webhook)
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
    updated_at = NOW()
WHERE chatbot_id = 'sana_local_format' 
  AND webhook_url IS NULL;

-- ✅ HOTOVO! Ověř výsledek:
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    is_active,
    updated_at
FROM public.chatbot_settings 
WHERE is_active = true
ORDER BY chatbot_name;
