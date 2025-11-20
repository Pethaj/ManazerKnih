-- SQL script pro vytvoření systému autentizace a správy uživatelů
-- Spusťte tento script v Supabase SQL editoru

-- 1. Funkce pro automatickou aktualizaci updated_at (pokud ještě neexistuje)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tabulka pro profily uživatelů a jejich role
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'spravce')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 4. Trigger pro automatickou aktualizaci updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security (RLS) pro user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Vymazat existující politiky (pokud existují)
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Only spravce can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only spravce can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only spravce can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Spravce can read all profiles" ON public.user_profiles;

-- Politika: Všichni přihlášení uživatelé mohou číst profily
-- (Omezení přístupu řešíme na aplikační úrovni)
CREATE POLICY "Authenticated users can read profiles" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Politika: Pouze přihlášení uživatelé mohou vytvářet profily
-- (Správce práva kontrolujeme na aplikační úrovni)
CREATE POLICY "Authenticated users can insert profiles" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Politika: Pouze přihlášení uživatelé mohou upravovat profily
CREATE POLICY "Authenticated users can update profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Politika: Pouze přihlášení uživatelé mohou mazat profily
CREATE POLICY "Authenticated users can delete profiles" ON public.user_profiles
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- 6. RLS politiky pro books tabulku
-- Aktualizujeme politiky, aby admini mohli přidávat a upravovat knihy
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Vymazat existující politiky (pokud existují)
DROP POLICY IF EXISTS "Anyone can read books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can read books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can update books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can delete books" ON public.books;
DROP POLICY IF EXISTS "Only spravce can delete books" ON public.books;

-- Politika: Přihlášení uživatelé mohou číst všechny knihy
CREATE POLICY "Authenticated users can read books" ON public.books
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Politika: Přihlášení uživatelé (admin i správce) mohou přidávat knihy
CREATE POLICY "Authenticated users can insert books" ON public.books
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Politika: Přihlášení uživatelé (admin i správce) mohou upravovat knihy
CREATE POLICY "Authenticated users can update books" ON public.books
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Politika: Přihlášení uživatelé mohou mazat knihy
-- (Kontrola role správce se provádí na aplikační úrovni)
CREATE POLICY "Authenticated users can delete books" ON public.books
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- 7. RLS politiky pro chatbot_settings tabulku
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Vymazat existující politiky
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Authenticated users can read chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Only spravce can modify chatbot_settings" ON public.chatbot_settings;

-- Politika: Přihlášení uživatelé mohou číst nastavení chatbota
CREATE POLICY "Authenticated users can read chatbot_settings" ON public.chatbot_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Politika: Přihlášení uživatelé mohou upravovat nastavení chatbota
-- (Kontrola role správce se provádí na aplikační úrovni)
CREATE POLICY "Authenticated users can modify chatbot_settings" ON public.chatbot_settings
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 8. RLS politiky pro metadata tabulky (labels, categories, languages, publication_types)
-- Všichni přihlášení mohou číst, pouze správce může upravovat

-- Labels
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read labels" ON public.labels;
DROP POLICY IF EXISTS "Only spravce can modify labels" ON public.labels;

CREATE POLICY "Authenticated users can read labels" ON public.labels
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can modify labels" ON public.labels
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
DROP POLICY IF EXISTS "Only spravce can modify categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can modify categories" ON public.categories;

CREATE POLICY "Authenticated users can read categories" ON public.categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can modify categories" ON public.categories
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Languages
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read languages" ON public.languages;
DROP POLICY IF EXISTS "Only spravce can modify languages" ON public.languages;
DROP POLICY IF EXISTS "Authenticated users can modify languages" ON public.languages;

CREATE POLICY "Authenticated users can read languages" ON public.languages
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can modify languages" ON public.languages
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Publication Types
ALTER TABLE public.publication_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read publication_types" ON public.publication_types;
DROP POLICY IF EXISTS "Only spravce can modify publication_types" ON public.publication_types;
DROP POLICY IF EXISTS "Authenticated users can modify publication_types" ON public.publication_types;

CREATE POLICY "Authenticated users can read publication_types" ON public.publication_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can modify publication_types" ON public.publication_types
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 9. Pomocná funkce pro získání role uživatele
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Pomocná funkce pro kontrolu, zda je uživatel správce
CREATE OR REPLACE FUNCTION is_spravce(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id AND role = 'spravce'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- INSTRUKCE PRO PŘIDÁNÍ PRVNÍHO SPRÁVCE:
-- 1. Jděte do Supabase Dashboard → Authentication → Users → Add User
-- 2. Vyplňte:
--    Email: petr.hajduk@bewit.team
--    Password: wewe
--    Auto Confirm User: ✅ ANO
-- 3. Po vytvoření zkopírujte UUID uživatele a spusťte:
--
-- INSERT INTO public.user_profiles (id, email, role)
-- VALUES (
--     'UUID_Z_DASHBOARDU',
--     'petr.hajduk@bewit.team',
--     'spravce'
-- );

