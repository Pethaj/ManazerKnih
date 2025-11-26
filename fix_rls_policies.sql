-- Script pro opravu RLS (Row Level Security) politik pro chatbot_settings
-- Tento script umožní UPDATE operace na tabulce chatbot_settings

-- PROBLÉM: UPDATE selhává s "The result contains 0 rows" i když záznam existuje
-- PŘÍČINA: RLS politiky blokují UPDATE operace
-- ŘEŠENÍ: Přidat správné RLS politiky pro UPDATE a INSERT

BEGIN;

-- 1. Nejprve odstraníme všechny existující politiky (aby nedošlo ke konfliktu)
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.chatbot_settings;

-- 2. Vytvoříme nové, správné politiky

-- Politika pro SELECT - povol čtení pro všechny (včetně anonymních)
CREATE POLICY "Allow read access to chatbot_settings" 
ON public.chatbot_settings 
FOR SELECT 
USING (true);

-- Politika pro INSERT - povol vkládání pro přihlášené uživatele
CREATE POLICY "Allow insert for authenticated users" 
ON public.chatbot_settings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Politika pro UPDATE - povol aktualizaci pro přihlášené uživatele
CREATE POLICY "Allow update for authenticated users" 
ON public.chatbot_settings 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Politika pro DELETE - povol mazání pro přihlášené uživatele
CREATE POLICY "Allow delete for authenticated users" 
ON public.chatbot_settings 
FOR DELETE 
TO authenticated
USING (true);

-- 3. Ujistíme se, že RLS je povoleno
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Ověření vytvořených politik
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'chatbot_settings'
ORDER BY cmd, policyname;

-- Měli byste vidět:
-- | schemaname | tablename          | policyname                           | permissive | roles             | cmd    |
-- |------------|-------------------|--------------------------------------|-----------|-------------------|--------|
-- | public     | chatbot_settings  | Allow delete for authenticated users | PERMISSIVE| {authenticated}   | DELETE |
-- | public     | chatbot_settings  | Allow insert for authenticated users | PERMISSIVE| {authenticated}   | INSERT |
-- | public     | chatbot_settings  | Allow read access to chatbot_settings| PERMISSIVE| {public}          | SELECT |
-- | public     | chatbot_settings  | Allow update for authenticated users | PERMISSIVE| {authenticated}   | UPDATE |

