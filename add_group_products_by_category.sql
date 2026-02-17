-- =====================================================
-- SQL Migrace: Přidání funkce pro grupování produktů podle kategorií
-- Datum: 2026-02-16
-- Popis: Přidává možnost zobrazit produkty v tabulce rozdělené podle kategorií
-- =====================================================

-- 1. Přidat nový sloupec do chatbot_settings
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS group_products_by_category BOOLEAN DEFAULT FALSE;

-- 2. Přidat komentář k sloupci
COMMENT ON COLUMN chatbot_settings.group_products_by_category IS 
'Pokud je TRUE, produkty v tabulce "Súvisející produkty BEWIT" se zobrazí rozdělené podle kategorií';

-- 3. Vytvořit index pro rychlejší dotazování
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_group_by_category 
ON chatbot_settings(group_products_by_category) 
WHERE group_products_by_category = TRUE;

-- 4. Validace - zkontroluj, že sloupec byl přidán
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chatbot_settings' 
        AND column_name = 'group_products_by_category'
    ) THEN
        RAISE NOTICE '✅ Sloupec group_products_by_category byl úspěšně přidán';
    ELSE
        RAISE EXCEPTION '❌ Chyba: Sloupec group_products_by_category nebyl přidán';
    END IF;
END $$;

-- 5. Zobrazit aktuální stav všech chatbotů
SELECT 
    chatbot_id,
    chatbot_name,
    group_products_by_category,
    is_active
FROM chatbot_settings
ORDER BY chatbot_name;
