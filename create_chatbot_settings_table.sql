-- SQL script pro vytvoření tabulky pro nastavení chatbotů
-- Spusťte tento script v Supabase SQL editoru

-- 1. Tabulka pro nastavení chatbotů
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id TEXT NOT NULL UNIQUE, -- Identifikátor chatbota (např. "sana_kancelar", "medbase_sana")
    chatbot_name TEXT NOT NULL, -- Lidsky čitelný název chatbota
    description TEXT, -- Popis chatbota
    
    -- Nastavení pro produktová doporučení
    product_recommendations BOOLEAN DEFAULT true,
    book_database BOOLEAN DEFAULT true,
    
    -- Pole pro povolené kategorie (reference na public.categories)
    allowed_categories UUID[] DEFAULT '{}', -- Pole UUID kategorií, které jsou povolené
    
    -- Pole pro povolené typy publikací (reference na public.publication_types)
    allowed_publication_types UUID[] DEFAULT '{}', -- Pole UUID typů publikací, které jsou povolené
    
    -- Pole pro povolené štítky (reference na public.labels) - pro budoucí rozšíření
    allowed_labels UUID[] DEFAULT '{}', -- Pole UUID štítků, které jsou povolené
    
    -- Metadata
    is_active BOOLEAN DEFAULT true, -- Zda je chatbot aktivní
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Kdo vytvořil nastavení
    updated_by UUID REFERENCES auth.users(id)  -- Kdo naposledy upravil nastavení
);

-- 2. Vytvoření indexů pro lepší výkon
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_chatbot_id ON public.chatbot_settings(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_is_active ON public.chatbot_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_allowed_categories ON public.chatbot_settings USING GIN(allowed_categories);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_allowed_publication_types ON public.chatbot_settings USING GIN(allowed_publication_types);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_allowed_labels ON public.chatbot_settings USING GIN(allowed_labels);

-- 3. RLS (Row Level Security)
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Povolení čtení pro všechny (pro fungování chatbotů)
CREATE POLICY "Allow read access to chatbot_settings" ON public.chatbot_settings 
    FOR SELECT USING (true);

-- Povolení všech operací pro administrátory (přizpůsobte podle vašich potřeb)
CREATE POLICY "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings 
    FOR ALL USING (true);

-- 4. Trigger pro automatické aktualizování updated_at
CREATE TRIGGER update_chatbot_settings_updated_at 
    BEFORE UPDATE ON public.chatbot_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Vložení výchozích nastavení pro existující chatboty
INSERT INTO public.chatbot_settings (
    chatbot_id, 
    chatbot_name, 
    description,
    product_recommendations,
    book_database,
    allowed_categories,
    allowed_publication_types
) VALUES 
    (
        'sana_kancelar', 
        'Sana Kancelář', 
        'Chatbot pro kancelářské potřeby s omezeným přístupem',
        false,
        true,
        '{}', -- Prozatím prázdné, naplní se přes admin rozhraní
        (SELECT ARRAY[id] FROM public.publication_types WHERE name = 'public') -- Pouze veřejné publikace
    ),
    (
        'medbase_sana', 
        'MedBase Sana', 
        'Hlavní chatbot s plným přístupem ke všem kategoriím a typům publikací',
        true,
        true,
        (SELECT ARRAY_AGG(id) FROM public.categories), -- Všechny kategorie
        (SELECT ARRAY_AGG(id) FROM public.publication_types) -- Všechny typy publikací
    ),
    (
        'general_chat', 
        'Obecný Chat', 
        'Základní chatbot pro obecné dotazy',
        false,
        true,
        '{}', -- Žádné kategorie
        (SELECT ARRAY[id] FROM public.publication_types WHERE name = 'public') -- Pouze veřejné publikace
    )
ON CONFLICT (chatbot_id) DO NOTHING;

-- 6. Pomocné funkce pro práci s nastavením chatbotů

-- Funkce pro získání dostupných kategorií pro chatbota
CREATE OR REPLACE FUNCTION get_chatbot_allowed_categories(chatbot_id_param TEXT)
RETURNS TABLE(id UUID, name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name
    FROM public.categories c
    JOIN public.chatbot_settings cs ON c.id = ANY(cs.allowed_categories)
    WHERE cs.chatbot_id = chatbot_id_param AND cs.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Funkce pro získání dostupných typů publikací pro chatbota
CREATE OR REPLACE FUNCTION get_chatbot_allowed_publication_types(chatbot_id_param TEXT)
RETURNS TABLE(id UUID, name TEXT, description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT pt.id, pt.name, pt.description
    FROM public.publication_types pt
    JOIN public.chatbot_settings cs ON pt.id = ANY(cs.allowed_publication_types)
    WHERE cs.chatbot_id = chatbot_id_param AND cs.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Funkce pro ověření, zda má chatbot přístup ke kategorii
CREATE OR REPLACE FUNCTION chatbot_has_access_to_category(
    chatbot_id_param TEXT, 
    category_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM public.chatbot_settings 
        WHERE chatbot_id = chatbot_id_param 
        AND is_active = true 
        AND category_id_param = ANY(allowed_categories)
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Funkce pro ověření, zda má chatbot přístup k typu publikace
CREATE OR REPLACE FUNCTION chatbot_has_access_to_publication_type(
    chatbot_id_param TEXT, 
    publication_type_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM public.chatbot_settings 
        WHERE chatbot_id = chatbot_id_param 
        AND is_active = true 
        AND publication_type_id_param = ANY(allowed_publication_types)
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

COMMIT;
