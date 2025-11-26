-- ⚡ QUICK FIX: Oprava RLS politik pro chatbot_settings UPDATE
-- Problém: UPDATE selhal kvůli chybějícím oprávněním v RLS politikách
-- Řešení: Povolit všechny operace (pro development/admin prostředí)

BEGIN;

-- =====================================================
-- KROK 1: Zkontroluj aktuální RLS politiky
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'chatbot_settings';

-- =====================================================
-- KROK 2: Odstraň všechny existující politiky
-- =====================================================
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow insert access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow update access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow delete access to chatbot_settings" ON public.chatbot_settings;

-- =====================================================
-- KROK 3: Vytvoř nové politiky s plným přístupem
-- =====================================================

-- SELECT (čtení) - povoleno všem
CREATE POLICY "chatbot_settings_select_all"
    ON public.chatbot_settings
    FOR SELECT
    USING (true);

-- INSERT (vkládání) - povoleno všem
CREATE POLICY "chatbot_settings_insert_all"
    ON public.chatbot_settings
    FOR INSERT
    WITH CHECK (true);

-- UPDATE (aktualizace) - povoleno všem ⭐ DŮLEŽITÉ
CREATE POLICY "chatbot_settings_update_all"
    ON public.chatbot_settings
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- DELETE (mazání) - povoleno všem
CREATE POLICY "chatbot_settings_delete_all"
    ON public.chatbot_settings
    FOR DELETE
    USING (true);

-- =====================================================
-- KROK 4: Ověř, že RLS je zapnuté
-- =====================================================
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- KROK 5: Validace - zobraz nové politiky
-- =====================================================
SELECT 
    policyname,
    cmd AS operation,
    CASE 
        WHEN qual::text = 'true' THEN '✅ Povoleno všem'
        ELSE qual::text
    END as "using_clause",
    CASE 
        WHEN with_check::text = 'true' THEN '✅ Povoleno všem'
        WHEN with_check IS NULL THEN '-'
        ELSE with_check::text
    END as "with_check_clause"
FROM pg_policies 
WHERE tablename = 'chatbot_settings'
ORDER BY cmd;

-- =====================================================
-- KROK 6: Test UPDATE - zkus aktualizovat záznam
-- =====================================================
-- Tento test by měl projít bez chyby
UPDATE chatbot_settings 
SET product_button_recommendations = false 
WHERE chatbot_id = 'sana_chat'
RETURNING chatbot_id, chatbot_name, product_button_recommendations;

COMMIT;

-- =====================================================
-- ✅ HOTOVO!
-- =====================================================
-- Po spuštění tohoto scriptu:
-- 1. Refresh aplikaci v prohlížeči (F5)
-- 2. Zkus znovu uložit nastavení chatbota
-- 3. Mělo by fungovat bez RLS chyb

-- ⚠️ POZNÁMKA PRO PRODUKCI:
-- Tento script povoluje všechny operace všem uživatelům.
-- V produkčním prostředí byste měli nastavit přísnější pravidla,
-- například povolit UPDATE pouze přihlášeným adminům:
--
-- CREATE POLICY "chatbot_settings_update_admins_only"
--     ON public.chatbot_settings
--     FOR UPDATE
--     USING (auth.role() = 'authenticated' AND is_admin(auth.uid()))
--     WITH CHECK (auth.role() = 'authenticated' AND is_admin(auth.uid()));

