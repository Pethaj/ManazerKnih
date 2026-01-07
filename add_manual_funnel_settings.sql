-- ============================================================================
-- MIGRACE: Přidání nastavení pro produktový router a manuální funnel
-- ============================================================================
-- Datum: 2024-12-09
-- Popis: Přidává dva nové sloupce do chatbot_settings:
--        - enable_product_router: Zapnutí/vypnutí automatického produktového routeru
--        - enable_manual_funnel: Zapnutí manuálního funnel spouštěče (tlačítko místo calloutu)
-- ============================================================================

-- 1. Přidání sloupce enable_product_router
-- Defaultně TRUE - automatický router je standardně zapnutý
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS enable_product_router BOOLEAN DEFAULT TRUE;

-- 2. Přidání sloupce enable_manual_funnel  
-- Defaultně FALSE - manuální funnel je standardně vypnutý
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS enable_manual_funnel BOOLEAN DEFAULT FALSE;

-- 3. Komentáře pro dokumentaci
COMMENT ON COLUMN chatbot_settings.enable_product_router IS 'Zapnutí/vypnutí automatického produktového routeru (intent routing). Když je FALSE, vše jde jako standardní chat.';
COMMENT ON COLUMN chatbot_settings.enable_manual_funnel IS 'Zapnutí manuálního funnel spouštěče. Když je TRUE, místo žlutého calloutu se zobrazí tlačítko pro manuální zadání symptomů.';

-- 4. Aktualizace existujících chatbotů - nastavení výchozích hodnot
UPDATE chatbot_settings 
SET enable_product_router = TRUE 
WHERE enable_product_router IS NULL;

UPDATE chatbot_settings 
SET enable_manual_funnel = FALSE 
WHERE enable_manual_funnel IS NULL;

-- 5. Ověření
SELECT 
    chatbot_id, 
    chatbot_name, 
    enable_product_router, 
    enable_manual_funnel
FROM chatbot_settings
ORDER BY chatbot_name;

-- ============================================================================
-- HOTOVO! Nové sloupce byly přidány.
-- ============================================================================


















