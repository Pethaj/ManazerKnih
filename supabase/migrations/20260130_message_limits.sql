-- Migration: Message Limits System
-- Datum: 2026-01-30
-- Popis: Systém pro sledování a omezování denních limitů zpráv

-- 1️⃣ Vytvoření tabulky message_limits
CREATE TABLE IF NOT EXISTS message_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE, -- NULL = globální limit
  daily_limit INTEGER DEFAULT NULL, -- NULL = bez limitu
  current_count INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ DEFAULT (date_trunc('day', NOW() AT TIME ZONE 'Europe/Prague') + INTERVAL '1 day') AT TIME ZONE 'Europe/Prague',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chatbot_id) -- Každý chatbot má max jeden záznam
);

-- 2️⃣ Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_message_limits_chatbot ON message_limits(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_message_limits_reset ON message_limits(reset_at);

-- 3️⃣ RLS policies (pokud používáš Row Level Security)
ALTER TABLE message_limits ENABLE ROW LEVEL SECURITY;

-- Admin může vše
CREATE POLICY "Admin full access to message_limits"
  ON message_limits
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Users mohou číst pouze své chatboty
CREATE POLICY "Users can read their chatbot limits"
  ON message_limits
  FOR SELECT
  USING (
    chatbot_id IN (
      SELECT id FROM chatbots WHERE user_id = auth.uid()
    )
    OR chatbot_id IS NULL -- Globální limit vidí všichni
  );

-- 4️⃣ Funkce pro atomické inkrementování čítače
CREATE OR REPLACE FUNCTION increment_message_count(limit_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE message_limits
  SET 
    current_count = current_count + 1,
    updated_at = NOW()
  WHERE id = limit_id;
END;
$$;

-- 5️⃣ Funkce pro reset všech čítačů (pro cron job)
CREATE OR REPLACE FUNCTION reset_all_message_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_midnight TIMESTAMPTZ;
BEGIN
  -- Vypočítej další půlnoc v Prague timezone
  next_midnight := (date_trunc('day', NOW() AT TIME ZONE 'Europe/Prague') + INTERVAL '1 day') AT TIME ZONE 'Europe/Prague';
  
  -- Reset všech čítačů
  UPDATE message_limits
  SET 
    current_count = 0,
    reset_at = next_midnight,
    updated_at = NOW()
  WHERE reset_at <= NOW();
  
  RAISE NOTICE 'Reset % message limit counters', (SELECT COUNT(*) FROM message_limits WHERE reset_at <= NOW());
END;
$$;

-- 6️⃣ Vložení globálního limitu (výchozí: bez limitu)
INSERT INTO message_limits (chatbot_id, daily_limit, current_count)
VALUES (NULL, NULL, 0)
ON CONFLICT (chatbot_id) DO NOTHING;

-- 7️⃣ Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_message_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_limits_updated_at
  BEFORE UPDATE ON message_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_message_limits_updated_at();

-- 8️⃣ Komentáře pro dokumentaci
COMMENT ON TABLE message_limits IS 'Denní limity zpráv pro chatboty a globální limit';
COMMENT ON COLUMN message_limits.chatbot_id IS 'NULL = globální limit, jinak ID konkrétního chatbota';
COMMENT ON COLUMN message_limits.daily_limit IS 'NULL = bez limitu, jinak maximální počet zpráv za den';
COMMENT ON COLUMN message_limits.current_count IS 'Aktuální počet zpráv dnes (resetuje se o půlnoci CET)';
COMMENT ON COLUMN message_limits.reset_at IS 'Čas dalšího resetu (půlnoc CET)';
