-- Oprava RLS politik pro chatbot_settings
-- Tento script opraví přístupy tak, aby aplikace mohla pracovat s anon klíčem

BEGIN;

-- Odstraníme stávající politiky
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;

-- Nové politiky - povolíme všechny operace pro anonymní uživatele
-- (v produkci byste měli nastavit přísnější pravidla)

-- Čtení pro všechny
CREATE POLICY "Allow read access to chatbot_settings"
    ON public.chatbot_settings
    FOR SELECT
    USING (true);

-- Insert pro všechny
CREATE POLICY "Allow insert access to chatbot_settings"
    ON public.chatbot_settings
    FOR INSERT
    WITH CHECK (true);

-- Update pro všechny
CREATE POLICY "Allow update access to chatbot_settings"
    ON public.chatbot_settings
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Delete pro všechny (volitelné, pokud chcete povolit mazání)
CREATE POLICY "Allow delete access to chatbot_settings"
    ON public.chatbot_settings
    FOR DELETE
    USING (true);

COMMIT;
