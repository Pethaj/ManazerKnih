-- Script pro opravu/vytvoření chybějících chatbot_settings záznamů
-- Spusťte tento script v Supabase SQL editoru

-- Tento script:
-- 1. Vytvoří chybějící chatboty pokud neexistují
-- 2. Nezmění existující záznamy (díky ON CONFLICT DO NOTHING)

BEGIN;

-- Vložení výchozích nastavení pro chatboty
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
    -- Aktualizujeme pouze popis a zajistíme že je aktivní
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
RETURNING chatbot_id, chatbot_name, is_active;

COMMIT;

-- Ověření výsledku
SELECT 
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    book_database,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types,
    is_active
FROM public.chatbot_settings
ORDER BY chatbot_name;

