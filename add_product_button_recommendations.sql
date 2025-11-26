-- Migration Script: Přidání sloupce product_button_recommendations
-- Datum: 2025-11-26
-- Účel: Přidání nové funkce "Produktové doporučení na tlačítko" do chatbot nastavení

-- =====================================================
-- KROK 1: Přidání nového sloupce do tabulky chatbot_settings
-- =====================================================

ALTER TABLE chatbot_settings
ADD COLUMN IF NOT EXISTS product_button_recommendations BOOLEAN DEFAULT false;

COMMENT ON COLUMN chatbot_settings.product_button_recommendations IS 
'Produktové doporučení na tlačítko - zobrazí tlačítko "Doporučit produkty" na konci odpovědi chatbota';

-- =====================================================
-- KROK 2: Nastavení výchozích hodnot pro existující chatboty
-- =====================================================

-- Všechny existující chatboty budou mít tuto funkci vypnutou
UPDATE chatbot_settings
SET product_button_recommendations = false
WHERE product_button_recommendations IS NULL;

-- =====================================================
-- KROK 3: Validace a kontrola
-- =====================================================

-- Zkontroluj, že sloupec byl úspěšně přidán
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'chatbot_settings' 
    AND column_name = 'product_button_recommendations';

-- Zobraz aktuální nastavení všech chatbotů
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,
    book_database,
    is_active
FROM chatbot_settings
ORDER BY chatbot_id;

-- =====================================================
-- KONEC MIGRACE
-- =====================================================

-- ℹ️ Poznámka: 
-- Po spuštění této migrace bude nová funkce dostupná v UI ChatbotManagement
-- Administrátor může pro jednotlivé chatboty zapnout/vypnout tuto funkci

