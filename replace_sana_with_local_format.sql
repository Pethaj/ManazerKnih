-- SQL script pro nahrazení "Sana Chat" za "Sana Local Format"
-- Tento script:
-- 1. Aktualizuje existující 'sana_chat' na 'sana_local_format'
-- 2. Nebo vytvoří nový záznam, pokud 'sana_chat' neexistuje

-- KROK 1: Zkontroluj, zda existuje 'sana_chat'
DO $$
BEGIN
    -- Pokud existuje 'sana_chat', updatuj ho na 'sana_local_format'
    IF EXISTS (SELECT 1 FROM public.chatbot_settings WHERE chatbot_id = 'sana_chat') THEN
        UPDATE public.chatbot_settings 
        SET 
            chatbot_id = 'sana_local_format',
            chatbot_name = 'Sana Local Format',
            description = 'Pokročilý chatbot s markdown renderingem a plným přístupem k databázi knih. Optimalizováno pro krásné formátování výstupu.',
            updated_at = NOW()
        WHERE chatbot_id = 'sana_chat';
        
        RAISE NOTICE 'Sana Chat byl úspěšně přejmenován na Sana Local Format';
    ELSE
        RAISE NOTICE 'Sana Chat nebyl nalezen, bude vytvořen nový záznam';
    END IF;
END $$;

-- KROK 2: Pokud 'sana_local_format' stále neexistuje, vytvoř ho
INSERT INTO public.chatbot_settings (
    chatbot_id, 
    chatbot_name, 
    description,
    product_recommendations,
    product_button_recommendations,
    book_database,
    allowed_categories,
    allowed_publication_types,
    is_active
) 
SELECT 
    'sana_local_format', 
    'Sana Local Format', 
    'Pokročilý chatbot s markdown renderingem a plným přístupem k databázi knih. Optimalizováno pro krásné formátování výstupu.',
    false,  -- Produktová doporučení vypnuta
    false,  -- Produktové tlačítko vypnuto
    true,   -- Databáze knih zapnuta
    COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'), -- Všechny kategorie
    COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}'), -- Všechny typy publikací
    true    -- Aktivní
WHERE NOT EXISTS (
    SELECT 1 FROM public.chatbot_settings WHERE chatbot_id = 'sana_local_format'
);

-- KROK 3: Deaktivuj 'sana_2', pokud existuje (už není potřeba)
UPDATE public.chatbot_settings 
SET is_active = false, updated_at = NOW()
WHERE chatbot_id = 'sana_2';

-- KROK 4: Ověření výsledku
SELECT 
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    product_button_recommendations,
    book_database,
    is_active,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types,
    created_at,
    updated_at
FROM public.chatbot_settings 
WHERE chatbot_id IN ('sana_local_format', 'sana_chat', 'sana_2')
ORDER BY chatbot_id;

