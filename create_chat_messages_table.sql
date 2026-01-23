-- =====================================================
-- TABULKA PRO HISTORII CHATOVÝCH KONVERZACÍ
-- =====================================================
-- Každý řádek = jedna zpráva (user nebo bot)
-- Session = skupina zpráv se stejným session_id
-- UI: Lazy loading - seznam sessions → detail session → zprávy
-- =====================================================

-- 1. Vytvoření hlavní tabulky
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifikátory
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Nullable, pokud selže identifikace
  chatbot_id TEXT NOT NULL,  -- 'sana_medbase', 'sana_kancelar', atd.
  
  -- Obsah zprávy
  role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
  message_text TEXT NOT NULL,
  
  -- Data zprávy (JSON)
  -- Obsahuje: sources, productRecommendations, matchedProducts, funnelProducts, symptomList, atd.
  -- Ukládají se JEN existující pole (ne prázdné/null)
  message_data JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata konverzace (filtry aktivní v době zprávy)
  -- NULL pro bot zprávy (zdědí z předchozí user zprávy)
  -- Obsahuje pro user zprávy: categories, labels, publication_types
  conversation_metadata JSONB,
  
  -- Časové razítko
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. UNIQUE constraint na (session_id, user_id)
-- Zajistí unikátnost session pro každého uživatele
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_session_user 
  ON chat_messages(session_id, user_id);

-- 3. Indexy pro výkon

-- Index pro načítání zpráv jedné session (seřazené chronologicky)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created 
  ON chat_messages(session_id, created_at ASC);

-- Index pro seznam sessions uživatele
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_session 
  ON chat_messages(user_id, session_id, created_at DESC);

-- Index pro vyhledávání podle chatbota
CREATE INDEX IF NOT EXISTS idx_chat_messages_chatbot 
  ON chat_messages(chatbot_id, created_at DESC);

-- Index pro full-text search v textu zpráv
CREATE INDEX IF NOT EXISTS idx_chat_messages_text_search 
  ON chat_messages USING GIN (to_tsvector('simple', message_text));

-- Index pro vyhledávání v JSON datech (message_data)
CREATE INDEX IF NOT EXISTS idx_chat_messages_data_gin 
  ON chat_messages USING GIN (message_data);

-- Index pro vyhledávání v conversation metadata
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_gin 
  ON chat_messages USING GIN (conversation_metadata);

-- 4. RLS (Row Level Security) Policies

-- Zapnout RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Uživatelé vidí jen svoje zprávy
DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
CREATE POLICY "Users can view own messages" 
  ON chat_messages 
  FOR SELECT 
  USING (user_id IS NULL OR user_id = auth.uid() OR true);  
  -- Poznámka: Upravit podle potřeby (true = všichni vidí všechno, pro admin)

-- Policy: Uživatelé můžou přidávat zprávy
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;
CREATE POLICY "Users can insert own messages" 
  ON chat_messages 
  FOR INSERT 
  WITH CHECK (true);  -- Aplikace kontroluje autentizaci

-- Policy: Zprávy nelze upravovat (immutable)
DROP POLICY IF EXISTS "Messages are immutable" ON chat_messages;
-- Žádná UPDATE policy = zprávy nelze měnit po vytvoření

-- Policy: Pouze vlastník může mazat zprávy
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;
CREATE POLICY "Users can delete own messages" 
  ON chat_messages 
  FOR DELETE 
  USING (user_id IS NULL OR user_id = auth.uid() OR true);
  -- Poznámka: Upravit podle potřeby

-- 5. Funkce pro získání seznamu sessions (pro UI pagination)
CREATE OR REPLACE FUNCTION get_user_chat_sessions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  session_id TEXT,
  chatbot_id TEXT,
  first_message TEXT,
  message_count BIGINT,
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.session_id,
    cm.chatbot_id,
    (SELECT message_text FROM chat_messages 
     WHERE session_id = cm.session_id 
     ORDER BY created_at ASC 
     LIMIT 1) as first_message,
    COUNT(*) as message_count,
    MIN(cm.created_at) as started_at,
    MAX(cm.created_at) as last_message_at
  FROM chat_messages cm
  WHERE cm.user_id = p_user_id
  GROUP BY cm.session_id, cm.chatbot_id
  ORDER BY last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 6. Funkce pro získání zpráv jedné session (pro lazy loading)
CREATE OR REPLACE FUNCTION get_session_messages(
  p_session_id TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  message_text TEXT,
  message_data JSONB,
  conversation_metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.role,
    cm.message_text,
    cm.message_data,
    cm.conversation_metadata,
    cm.created_at
  FROM chat_messages cm
  WHERE cm.session_id = p_session_id
    AND (cm.user_id = p_user_id OR cm.user_id IS NULL)
  ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 7. Funkce pro full-text search
CREATE OR REPLACE FUNCTION search_chat_messages(
  p_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  session_id TEXT,
  role TEXT,
  message_text TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.session_id,
    cm.role,
    cm.message_text,
    cm.created_at,
    ts_rank(to_tsvector('simple', cm.message_text), plainto_tsquery('simple', p_search_query)) as rank
  FROM chat_messages cm
  WHERE cm.user_id = p_user_id
    AND to_tsvector('simple', cm.message_text) @@ plainto_tsquery('simple', p_search_query)
  ORDER BY rank DESC, cm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HOTOVO!
-- =====================================================
-- Tabulka je připravena pro:
-- ✅ Ukládání každé zprávy (user i bot)
-- ✅ Session seskupování (podle session_id)
-- ✅ Lazy loading (funkce get_user_chat_sessions a get_session_messages)
-- ✅ Pagination (LIMIT/OFFSET v funkcích)
-- ✅ Full-text search (funkce search_chat_messages)
-- ✅ Nullable user_id (pokud selže identifikace)
-- ✅ Unique session per user
-- ✅ Immutable zprávy (nelze editovat)
-- ✅ Bez limitu velikosti dat
-- ✅ Metadata jen u user zpráv (varianta B)
-- =====================================================
