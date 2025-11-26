-- ⚡ SUPER RYCHLÝ FIX RLS - Zkopíruj a spusť v Supabase SQL Editor

-- Odstraň staré politiky
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow insert access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow update access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow delete access to chatbot_settings" ON public.chatbot_settings;

-- Vytvoř nové politiky s plným přístupem
CREATE POLICY "chatbot_settings_select_all" ON public.chatbot_settings FOR SELECT USING (true);
CREATE POLICY "chatbot_settings_insert_all" ON public.chatbot_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "chatbot_settings_update_all" ON public.chatbot_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chatbot_settings_delete_all" ON public.chatbot_settings FOR DELETE USING (true);

-- Test - mělo by projít
UPDATE chatbot_settings SET product_button_recommendations = false WHERE chatbot_id = 'sana_chat';

-- Zobraz výsledek
SELECT chatbot_id, chatbot_name, product_recommendations, product_button_recommendations, book_database 
FROM chatbot_settings ORDER BY chatbot_id;

-- ✅ Hotovo! Teď refresh aplikaci a zkus znovu uložit nastavení.

