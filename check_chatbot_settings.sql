-- Diagnostický script pro kontrolu stavu chatbot_settings
-- Spusťte tento script v Supabase SQL editoru pro diagnostiku problémů

-- 1. Zjistit, zda tabulka existuje
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chatbot_settings'
) AS table_exists;

-- 2. Zobrazit všechny záznamy v tabulce chatbot_settings
SELECT 
    id,
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    book_database,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types,
    is_active,
    created_at,
    updated_at
FROM public.chatbot_settings
ORDER BY created_at DESC;

-- 3. Zkontrolovat RLS politiky
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

-- 4. Zkontrolovat, zda existuje konkrétní chatbot 'sana_chat'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.chatbot_settings WHERE chatbot_id = 'sana_chat')
        THEN 'Chatbot "sana_chat" EXISTUJE'
        ELSE 'Chatbot "sana_chat" NEEXISTUJE - spusťte create_chatbot_settings_table.sql'
    END AS status;

-- 5. Pokud neexistuje žádný záznam, vytvořte výchozí chatboty
-- POZNÁMKA: Toto se spustí pouze pokud spustíte celý blok níže

-- UNCOMMENT pro vytvoření výchozích chatbotů:
/*
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
        'sana_chat', 
        'Sana Chat', 
        'Hlavní chatbot pro lékařskou literaturu s plným přístupem ke všem kategoriím',
        false,
        true,
        COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'),
        COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}')
    ),
    (
        'product_chat', 
        'Product Chat', 
        'Chatbot se zaměřením na produktová doporučení',
        true,
        false,
        '{}',
        '{}'
    ),
    (
        'test_chat', 
        'Testovací Chat', 
        'Testovací chatbot s omezeným přístupem',
        false,
        true,
        '{}',
        COALESCE((SELECT ARRAY[id] FROM public.publication_types LIMIT 1), '{}')
    )
ON CONFLICT (chatbot_id) DO NOTHING
RETURNING chatbot_id, chatbot_name;
*/

