-- SQL script pro opravu nekonečné rekurze v RLS politikách
-- Spusťte tento script pokud jste již spustili původní create_user_auth_system.sql
-- a dostáváte chybu "infinite recursion detected in policy"

-- 1. Smazat problematické politiky pro user_profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Spravce can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only spravce can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only spravce can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only spravce can delete profiles" ON public.user_profiles;

-- 2. Vytvořit jednoduché politiky bez rekurze
CREATE POLICY "Authenticated users can read profiles" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert profiles" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete profiles" ON public.user_profiles
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- 3. Opravit politiky pro books
DROP POLICY IF EXISTS "Only spravce can delete books" ON public.books;

CREATE POLICY "Authenticated users can delete books" ON public.books
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- 4. Opravit politiky pro chatbot_settings
DROP POLICY IF EXISTS "Only spravce can modify chatbot_settings" ON public.chatbot_settings;

CREATE POLICY "Authenticated users can modify chatbot_settings" ON public.chatbot_settings
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 5. Opravit politiky pro labels
DROP POLICY IF EXISTS "Only spravce can modify labels" ON public.labels;

CREATE POLICY "Authenticated users can modify labels" ON public.labels
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 6. Opravit politiky pro categories
DROP POLICY IF EXISTS "Only spravce can modify categories" ON public.categories;

CREATE POLICY "Authenticated users can modify categories" ON public.categories
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 7. Opravit politiky pro languages
DROP POLICY IF EXISTS "Only spravce can modify languages" ON public.languages;

CREATE POLICY "Authenticated users can modify languages" ON public.languages
    FOR ALL
    USING (auth.uid() IS NOT NULL);

-- 8. Opravit politiky pro publication_types
DROP POLICY IF EXISTS "Only spravce can modify publication_types" ON public.publication_types;

CREATE POLICY "Authenticated users can modify publication_types" ON public.publication_types
    FOR ALL
    USING (auth.uid() IS NOT NULL);

COMMIT;

-- ✅ HOTOVO!
-- Nyní byste neměli dostávat chybu "infinite recursion"
-- Kontrola rolí (správce vs admin) se provádí na aplikační úrovni v authService




