-- SQL script pro přidání pole "is_default_web_chatbot"
-- Toto pole označí, který chatbot se má zobrazit v bublině na webu

-- Přidej nové pole do tabulky chatbot_settings
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS is_default_web_chatbot BOOLEAN DEFAULT false;

-- Nastav komentář k poli
COMMENT ON COLUMN public.chatbot_settings.is_default_web_chatbot 
IS 'Označuje, zda se tento chatbot má zobrazit v bublině na webu (medbase)';

-- Vytvoř funkci, která zajistí, že jen jeden chatbot může být označen jako default
CREATE OR REPLACE FUNCTION ensure_single_default_web_chatbot()
RETURNS TRIGGER AS $$
BEGIN
    -- Pokud se nastavuje is_default_web_chatbot na true
    IF NEW.is_default_web_chatbot = true THEN
        -- Zruš označení u všech ostatních chatbotů
        UPDATE public.chatbot_settings 
        SET is_default_web_chatbot = false 
        WHERE chatbot_id != NEW.chatbot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vytvoř trigger, který automaticky zajistí, že jen jeden chatbot je default
DROP TRIGGER IF EXISTS trigger_ensure_single_default_web_chatbot ON public.chatbot_settings;
CREATE TRIGGER trigger_ensure_single_default_web_chatbot
    BEFORE UPDATE OR INSERT ON public.chatbot_settings
    FOR EACH ROW
    WHEN (NEW.is_default_web_chatbot = true)
    EXECUTE FUNCTION ensure_single_default_web_chatbot();

-- Nastav sana_local_format jako default (pokud existuje)
UPDATE public.chatbot_settings 
SET is_default_web_chatbot = true 
WHERE chatbot_id = 'sana_local_format';

-- Pokud sana_local_format neexistuje, nastav sana_chat jako default
UPDATE public.chatbot_settings 
SET is_default_web_chatbot = true 
WHERE chatbot_id = 'sana_chat' 
  AND NOT EXISTS (SELECT 1 FROM public.chatbot_settings WHERE chatbot_id = 'sana_local_format');

-- Ověření
SELECT 
    chatbot_id,
    chatbot_name,
    is_active,
    is_default_web_chatbot,
    description
FROM public.chatbot_settings 
WHERE is_active = true
ORDER BY is_default_web_chatbot DESC, chatbot_name;





