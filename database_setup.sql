-- =====================================================
-- NOVÝ VLASTNÍ AUTENTIZAČNÍ SYSTÉM
-- Kompletní odstranění Supabase Authentication
-- =====================================================

-- 1. Vytvoření tabulky users (pokud ještě neexistuje)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'spravce')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index pro rychlé vyhledávání podle emailu
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Funkce pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Trigger pro automatickou aktualizaci updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Každý může číst své vlastní údaje
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" 
    ON users 
    FOR SELECT 
    USING (true); -- Pro jednoduchost: všichni vidí všechny uživatele (můžete upravit podle potřeby)

-- Policy: Uživatelé mohou aktualizovat své vlastní údaje
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" 
    ON users 
    FOR UPDATE 
    USING (true) -- Pro jednoduchost: zatím může každý upravovat (bude kontrolováno v aplikaci)
    WITH CHECK (true);

-- Policy: Pouze admini mohou přidávat nové uživatele
DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" 
    ON users 
    FOR INSERT 
    WITH CHECK (true); -- Pro jednoduchost: zatím může každý (bude kontrolováno v aplikaci)

-- Policy: Pouze admini mohou mazat uživatele
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" 
    ON users 
    FOR DELETE 
    USING (true); -- Pro jednoduchost: zatím může každý (bude kontrolováno v aplikaci)

-- 6. Vytvoření prvního správce (heslo: hajd2847)
-- Hash pro heslo "hajd2847" (4 písmena z příjmení + 4 náhodné číslice)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
    'petr.hajduk@bewit.team',
    '$2b$10$Y6bcbm5OgmqUVsjQAJ1i3uutij9sDBj6rXWSd5pVyWOkOKdHtc51y', -- hajd2847
    'Petr',
    'Hajduk',
    'spravce'
)
ON CONFLICT (email) DO NOTHING;

-- Záložní admin účet (heslo: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
    'admin@admin.cz',
    '$2a$10$rVxQ8vXl5PjOcjKFWxL3.eVjGJH0OoqYKGJQXxZQH6mJm5vQxH7mu', -- admin123
    'Admin',
    'Administrátor',
    'spravce'
)
ON CONFLICT (email) DO NOTHING;

-- 7. Vytvoření tabulky pro session tokeny (optional - pro logout funkcionalitu)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pro rychlé vyhledávání podle tokenu
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- RLS pro sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" 
    ON user_sessions 
    FOR ALL 
    USING (true);

-- 8. Funkce pro čištění vypršelých sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HOTOVO!
-- =====================================================
-- Pro připojení použijte Supabase anon key pro běžné operace
-- Aplikace bude kontrolovat uživatele podle tabulky users
-- =====================================================

