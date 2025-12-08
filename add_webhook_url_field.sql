-- SQL script pro přidání pole webhook_url do chatbot_settings
-- Spusťte tento script v Supabase SQL editoru

-- KROK 1: Přidej nové pole webhook_url
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- KROK 2: Nastav webhook URL pro Wany.Chat
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
    updated_at = NOW()
WHERE chatbot_id = 'vany_chat';

-- KROK 3: Nastav také webhook URL pro ostatní existující chatboty (volitelné)
-- Sana Local Format používá původní webhook
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
WHERE chatbot_id IN ('vany_chat', 'sana_local_format')
ORDER BY chatbot_name;
