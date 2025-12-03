-- ================================================================
-- AKTIVACE inline_product_links pro Sana Local Format
-- ================================================================

-- 1. Přidej sloupec pokud neexistuje
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS inline_product_links BOOLEAN DEFAULT false;

-- 2. Zjisti jaké chatboty máme
SELECT 
    chatbot_id,
    chatbot_name,
    inline_product_links,
    book_database,
    is_active
FROM public.chatbot_settings
ORDER BY chatbot_name;

-- 3. Aktivuj inline_product_links pro sana_local_format
UPDATE public.chatbot_settings
SET inline_product_links = true
WHERE chatbot_id = 'sana_local_format';

-- 4. Pokud sana_local_format neexistuje, zkus sana_chat
UPDATE public.chatbot_settings
SET inline_product_links = true
WHERE chatbot_id = 'sana_chat';

-- 5. Ověř výsledek
SELECT 
    chatbot_id,
    chatbot_name,
    inline_product_links,
    product_recommendations,
    product_button_recommendations,
    book_database,
    is_active
FROM public.chatbot_settings
WHERE chatbot_id IN ('sana_local_format', 'sana_chat', 'sana_2')
ORDER BY chatbot_name;

-- 6. Zobraz všechny sloupce pro debug
\d+ chatbot_settings;


