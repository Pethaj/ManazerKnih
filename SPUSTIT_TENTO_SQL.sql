-- 🚀 JEDNODUCHÝ SQL SCRIPT - Spusť tento soubor v Supabase SQL editoru
-- Přidá možnost nastavit výchozí chatbot pro web

-- KROK 1: Přidej nové pole
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS is_default_web_chatbot BOOLEAN DEFAULT false;

-- KROK 2: Nastav sana_local_format jako výchozí (nebo sana_chat, pokud local_format neexistuje)
UPDATE public.chatbot_settings 
SET is_default_web_chatbot = true 
WHERE chatbot_id = 'sana_local_format';

-- Pokud sana_local_format neexistuje, nastav sana_chat
UPDATE public.chatbot_settings 
SET is_default_web_chatbot = true 
WHERE chatbot_id = 'sana_chat' 
  AND NOT EXISTS (SELECT 1 FROM public.chatbot_settings WHERE chatbot_id = 'sana_local_format');

-- KROK 3: Vytvoř funkci, která zajistí, že jen jeden chatbot je označený
CREATE OR REPLACE FUNCTION ensure_single_default_web_chatbot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default_web_chatbot = true THEN
        UPDATE public.chatbot_settings 
        SET is_default_web_chatbot = false 
        WHERE chatbot_id != NEW.chatbot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- KROK 4: Vytvoř trigger
DROP TRIGGER IF EXISTS trigger_ensure_single_default_web_chatbot ON public.chatbot_settings;
CREATE TRIGGER trigger_ensure_single_default_web_chatbot
    BEFORE UPDATE OR INSERT ON public.chatbot_settings
    FOR EACH ROW
    WHEN (NEW.is_default_web_chatbot = true)
    EXECUTE FUNCTION ensure_single_default_web_chatbot();

-- ✅ HOTOVO! Ověř výsledek:
SELECT 
    chatbot_id,
    chatbot_name,
    is_active,
    is_default_web_chatbot
FROM public.chatbot_settings 
WHERE is_active = true
ORDER BY is_default_web_chatbot DESC, chatbot_name;





