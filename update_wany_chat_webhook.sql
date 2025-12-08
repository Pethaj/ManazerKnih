-- Aktualizace webhook URL pro Wany.Chat chatbot
-- Tento script nastaví správný N8N webhook URL pro Wany.Chat

-- KROK 1: Ujisti se, že pole webhook_url existuje (pokud už není přidáno)
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- KROK 2: Nastav webhook URL pro Wany.Chat
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
    updated_at = NOW()
WHERE chatbot_id = 'vany_chat';

-- KROK 3: Nastav také webhook pro Sana Local Format (pokud ještě nemá nastavený)
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
    updated_at = NOW()
WHERE chatbot_id = 'sana_local_format' 
  AND webhook_url IS NULL;

-- OVĚŘENÍ: Zobraz všechny aktivní chatboty s jejich webhook URLs
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    is_active,
    updated_at
FROM public.chatbot_settings 
WHERE is_active = true
ORDER BY chatbot_name;
