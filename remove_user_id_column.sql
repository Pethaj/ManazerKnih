-- ============================================================================
-- ODSTRANĚNÍ SLOUPCE user_id Z TABULKY chat_messages
-- ============================================================================
-- 
-- DŮVOD: user_id není potřeba, všechny user informace se ukládají do message_data.user_info
-- Sloupec user_id způsobuje chyby při ukládání external user ID (čísla místo UUID)
--
-- DATUM: 29. ledna 2026
-- ============================================================================

-- 1. Nejprve zkontrolujeme, co je v tabulce
SELECT 
    id,
    session_id,
    user_id,
    chatbot_id,
    role,
    message_data->'user_info' as user_info_data,
    created_at
FROM chat_messages
LIMIT 5;

-- 2. Smazání sloupce user_id
ALTER TABLE chat_messages 
DROP COLUMN IF EXISTS user_id;

-- 3. Ověření, že sloupec byl smazán
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages';

-- ============================================================================
-- VÝSLEDEK: 
-- - user_id sloupec odstraněn
-- - Všechny user informace jsou v message_data.user_info (včetně tokenEshop)
-- - Žádné UUID chyby při ukládání external user dat
-- ============================================================================
