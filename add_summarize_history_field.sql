-- =====================================================
-- MIGRACE: Přidání pole summarize_history
-- =====================================================
-- Přidává checkbox nastavení pro automatickou sumarizaci
-- historie konverzací pomocí LLM modelu.
-- 
-- Použití:
-- - summarize_history = true: Historie se sumarizuje před
--   odesláním do N8N webhooku
-- - summarize_history = false (výchozí): Historie se 
--   posílá celá (současné chování)
-- =====================================================

-- Přidat sloupec summarize_history do chatbot_settings
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS summarize_history BOOLEAN DEFAULT false;

-- Vytvořit index pro rychlé vyhledávání chatbotů se sumarizací
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_summarize_history 
ON chatbot_settings(summarize_history) 
WHERE summarize_history = true;

-- Volitelně: Zapnout sumarizaci pro vany_chat (testovací účely)
-- ODKOMENTOVAT PO TESTOVÁNÍ:
-- UPDATE chatbot_settings 
-- SET summarize_history = true 
-- WHERE chatbot_id = 'vany_chat';

COMMIT;

-- =====================================================
-- HOTOVO!
-- =====================================================
-- ✅ Pole summarize_history přidáno
-- ✅ Index vytvořen pro optimalizaci
-- ✅ Výchozí hodnota = false (zpětná kompatibilita)
-- =====================================================
