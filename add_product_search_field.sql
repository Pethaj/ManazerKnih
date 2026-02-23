-- =====================================================
-- MIGRACE: Přidání pole enable_product_search
-- =====================================================
-- Přidává checkbox nastavení pro povolení přepínače
-- mezi AI chatem a vyhledávačem produktů (Feed Agent).
-- 
-- Použití:
-- - enable_product_search = true: V chat okně se zobrazí
--   přepínač AI Chat / Vyhledávač produktů
-- - enable_product_search = false (výchozí): Přepínač
--   se nezobrazí, pouze AI chat
-- =====================================================

-- Přidat sloupec enable_product_search do chatbot_settings
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS enable_product_search BOOLEAN DEFAULT false;

-- Vytvořit index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_enable_product_search 
ON chatbot_settings(enable_product_search) 
WHERE enable_product_search = true;

-- Aktualizovat schema cache (Supabase)
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- HOTOVO!
-- =====================================================
-- ✅ Pole enable_product_search přidáno
-- ✅ Index vytvořen pro optimalizaci
-- ✅ Výchozí hodnota = false (zpětná kompatibilita)
-- ✅ Schema cache obnovena
-- =====================================================
