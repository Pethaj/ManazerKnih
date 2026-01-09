-- SQL script pro kontrolu nastavení vany_chat chatbota
-- Zkontroluje, jaké kategorie a typy publikací má vany_chat povolené

-- 1. Zobrazí základní info o vany_chat
SELECT 
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    book_database,
    is_active,
    array_length(allowed_categories, 1) as num_allowed_categories,
    array_length(allowed_publication_types, 1) as num_allowed_publication_types
FROM public.chatbot_settings 
WHERE chatbot_id = 'vany_chat';

-- 2. Zobrazí konkrétní povolené kategorie (s názvy)
SELECT 
    cs.chatbot_id,
    cs.chatbot_name,
    array_agg(c.name ORDER BY c.name) as allowed_category_names
FROM public.chatbot_settings cs
LEFT JOIN public.categories c ON c.id = ANY(cs.allowed_categories)
WHERE cs.chatbot_id = 'vany_chat'
GROUP BY cs.chatbot_id, cs.chatbot_name;

-- 3. Zobrazí konkrétní povolené typy publikací (s názvy)
SELECT 
    cs.chatbot_id,
    cs.chatbot_name,
    array_agg(pt.name ORDER BY pt.name) as allowed_publication_type_names
FROM public.chatbot_settings cs
LEFT JOIN public.publication_types pt ON pt.id = ANY(cs.allowed_publication_types)
WHERE cs.chatbot_id = 'vany_chat'
GROUP BY cs.chatbot_id, cs.chatbot_name;

-- 4. Zobrazí všechny dostupné kategorie (pro referenci)
SELECT 
    id,
    name,
    CASE 
        WHEN id = ANY(
            SELECT unnest(allowed_categories) 
            FROM chatbot_settings 
            WHERE chatbot_id = 'vany_chat'
        ) THEN '✅ Povoleno pro vany_chat'
        ELSE '❌ Nepovoleno'
    END as status
FROM public.categories
ORDER BY name;

-- 5. Zobrazí všechny dostupné typy publikací (pro referenci)
SELECT 
    id,
    name,
    description,
    CASE 
        WHEN id = ANY(
            SELECT unnest(allowed_publication_types) 
            FROM chatbot_settings 
            WHERE chatbot_id = 'vany_chat'
        ) THEN '✅ Povoleno pro vany_chat'
        ELSE '❌ Nepovoleno'
    END as status
FROM public.publication_types
ORDER BY name;



















