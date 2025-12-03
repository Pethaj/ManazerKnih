-- ================================================================
-- OPRAVA: Aktivuj inline_product_links pro VŠECHNY chatboty
-- ================================================================

-- 1. Přidej sloupec pokud neexistuje
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS inline_product_links BOOLEAN DEFAULT false;

-- 2. Aktivuj pro VŠECHNY chatboty
UPDATE public.chatbot_settings
SET inline_product_links = true;

-- 3. Ověř že to funguje
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,
    inline_product_links,
    book_database,
    is_active
FROM public.chatbot_settings
ORDER BY chatbot_name;

-- 4. Specificky pro tvůj chatbot (nahraď ID)
SELECT 
    chatbot_id,
    chatbot_name,
    inline_product_links
FROM public.chatbot_settings
WHERE chatbot_id LIKE '%sana%' OR chatbot_id LIKE '%bewit%';


