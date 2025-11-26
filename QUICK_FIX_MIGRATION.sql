-- ⚡ QUICK FIX: Přidání sloupce product_button_recommendations
-- Zkopíruj celý tento soubor do Supabase SQL Editor a klikni Run

-- Přidej sloupec
ALTER TABLE chatbot_settings
ADD COLUMN IF NOT EXISTS product_button_recommendations BOOLEAN DEFAULT false;

-- Nastav výchozí hodnoty pro existující záznamy
UPDATE chatbot_settings
SET product_button_recommendations = false
WHERE product_button_recommendations IS NULL;

-- Kontrola - zobraz všechny chatboty
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,  -- ⭐ nový sloupec
    book_database,
    is_active
FROM chatbot_settings
ORDER BY chatbot_id;

-- ✅ Hotovo! Teď refresh stránku v prohlížeči a zkus znovu uložit nastavení.

