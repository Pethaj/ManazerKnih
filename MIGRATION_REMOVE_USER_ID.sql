-- ============================================================================
-- MIGRACE: ODSTRANĚNÍ SLOUPCE user_id Z TABULKY chat_messages
-- ============================================================================
-- 
-- DŮVOD: 
-- - user_id není potřeba, všechny user informace se ukládají do message_data.user_info
-- - Sloupec user_id způsobuje chyby při ukládání external user ID (čísla místo UUID)
-- - External uživatelé (z iframe embed) nemají Supabase UUID, mají ID z externího systému
--
-- DATUM: 29. ledna 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- KROK 1: SMAZÁNÍ RPC FUNKCÍ závislých na user_id
-- ============================================================================

-- Funkce pro získání seznamu sessions uživatele
DROP FUNCTION IF EXISTS get_user_chat_sessions(UUID, INTEGER, INTEGER);

-- Funkce pro získání zpráv jedné session
DROP FUNCTION IF EXISTS get_session_messages(TEXT, UUID);

-- Funkce pro full-text search
DROP FUNCTION IF EXISTS search_chat_messages(UUID, TEXT, INTEGER);

RAISE NOTICE 'Krok 1/5: RPC funkce smazány ✓';

-- ============================================================================
-- KROK 2: SMAZÁNÍ RLS POLICIES závislých na user_id
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;

RAISE NOTICE 'Krok 2/5: RLS policies smazány ✓';

-- ============================================================================
-- KROK 3: SMAZÁNÍ INDEXŮ závislých na user_id
-- ============================================================================

DROP INDEX IF EXISTS idx_chat_messages_session_user;
DROP INDEX IF EXISTS idx_chat_messages_user_session;

RAISE NOTICE 'Krok 3/5: Indexy závislé na user_id smazány ✓';

-- ============================================================================
-- KROK 4: SMAZÁNÍ SLOUPCE user_id
-- ============================================================================

ALTER TABLE chat_messages 
DROP COLUMN IF EXISTS user_id;

RAISE NOTICE 'Krok 4/5: Sloupec user_id odstraněn ✓';

-- ============================================================================
-- KROK 5: VYTVOŘENÍ NOVÝCH RLS POLICIES (bez user_id)
-- ============================================================================

-- Policy: Všichni můžou číst (pro embed bez autentizace)
CREATE POLICY "Anyone can view messages" 
  ON chat_messages 
  FOR SELECT 
  USING (true);

-- Policy: Všichni můžou přidávat zprávy (aplikace kontroluje autentizaci)
CREATE POLICY "Anyone can insert messages" 
  ON chat_messages 
  FOR INSERT 
  WITH CHECK (true);

-- Policy: Zprávy nelze mazat (immutable pro audit)
-- Žádná DELETE policy = zprávy nelze smazat

RAISE NOTICE 'Krok 5/5: Nové RLS policies vytvořeny ✓';

COMMIT;

-- ============================================================================
-- OVĚŘENÍ ZMĚN
-- ============================================================================

-- Zkontroluj sloupce tabulky
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Zkontroluj indexy
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'chat_messages';

-- Zkontroluj policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chat_messages';

-- ============================================================================
-- VÝSLEDEK: 
-- ============================================================================
-- ✅ user_id sloupec odstraněn
-- ✅ Všechny user informace jsou v message_data.user_info (včetně tokenEshop)
-- ✅ Žádné UUID chyby při ukládání external user dat
-- ✅ RPC funkce smazány (nebyly potřeba pro current use case)
-- ✅ RLS policies upraveny pro public access (embed widget)
-- ✅ Zprávy jsou immutable (audit trail)
-- ============================================================================
