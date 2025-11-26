-- KOMPLETNÍ OPRAVNÝ SCRIPT PRO CHATBOT SETTINGS
-- Tento script vyřeší všechny běžné problémy najednou:
-- 1. Vytvoří tabulku pokud neexistuje
-- 2. Vytvoří chybějící chatboty
-- 3. Opraví RLS politiky
-- 4. Ověří výsledek

-- =============================================================================
-- ČÁST 1: TABULKA A TRIGGERY
-- =============================================================================

BEGIN;

-- Trigger funkce pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vytvoření tabulky (pokud neexistuje)
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id TEXT NOT NULL UNIQUE,
    chatbot_name TEXT NOT NULL,
    description TEXT,
    product_recommendations BOOLEAN DEFAULT true,
    book_database BOOLEAN DEFAULT true,
    allowed_categories UUID[] DEFAULT '{}',
    allowed_publication_types UUID[] DEFAULT '{}',
    allowed_labels UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Vytvoření indexů
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_chatbot_id 
    ON public.chatbot_settings(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_is_active 
    ON public.chatbot_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_allowed_categories 
    ON public.chatbot_settings USING GIN(allowed_categories);
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_allowed_publication_types 
    ON public.chatbot_settings USING GIN(allowed_publication_types);

-- Trigger pro updated_at
DROP TRIGGER IF EXISTS update_chatbot_settings_updated_at ON public.chatbot_settings;
CREATE TRIGGER update_chatbot_settings_updated_at 
    BEFORE UPDATE ON public.chatbot_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- =============================================================================
-- ČÁST 2: RLS POLITIKY
-- =============================================================================

BEGIN;

-- Odstranění všech existujících politik
DROP POLICY IF EXISTS "Allow read access to chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow all operations on chatbot_settings for admins" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.chatbot_settings;

-- Vytvoření nových politik
CREATE POLICY "Allow read access to chatbot_settings" 
ON public.chatbot_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.chatbot_settings 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.chatbot_settings 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.chatbot_settings 
FOR DELETE 
TO authenticated
USING (true);

-- Povolení RLS
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- ČÁST 3: VYTVOŘENÍ VÝCHOZÍCH CHATBOTŮ
-- =============================================================================

BEGIN;

INSERT INTO public.chatbot_settings (
    chatbot_id, 
    chatbot_name, 
    description,
    product_recommendations,
    book_database,
    allowed_categories,
    allowed_publication_types,
    is_active
) VALUES 
    (
        'sana_chat', 
        'Sana Chat', 
        'Hlavní chatbot pro lékařskou literaturu s plným přístupem ke všem kategoriím',
        false,
        true,
        COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'),
        COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}'),
        true
    ),
    (
        'product_chat', 
        'Product Chat', 
        'Chatbot se zaměřením na produktová doporučení přes N8N webhook',
        true,
        false,
        '{}',
        '{}',
        true
    ),
    (
        'test_chat', 
        'Testovací Chat', 
        'Testovací chatbot s omezeným přístupem',
        false,
        true,
        '{}',
        COALESCE((SELECT ARRAY[id] FROM public.publication_types LIMIT 1), '{}'),
        true
    )
ON CONFLICT (chatbot_id) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

COMMIT;

-- =============================================================================
-- ČÁST 4: OVĚŘENÍ VÝSLEDKU
-- =============================================================================

-- Výpis všech chatbotů
SELECT 
    '=== CHATBOTI V DATABÁZI ===' as status;

SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    book_database,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types,
    is_active
FROM public.chatbot_settings
ORDER BY chatbot_name;

-- Výpis RLS politik
SELECT 
    '=== RLS POLITIKY ===' as status;

SELECT 
    policyname,
    cmd as operace,
    roles
FROM pg_policies 
WHERE tablename = 'chatbot_settings'
ORDER BY cmd, policyname;

-- Závěrečná zpráva
SELECT 
    '✅ HOTOVO! Obnovte aplikaci a zkuste uložit nastavení chatbota.' as vysledek;

