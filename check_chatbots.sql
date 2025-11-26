-- Kontrola existence tabulky chatbot_settings
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chatbot_settings'
) AS table_exists;

-- Zobrazení všech chatbotů v databázi
SELECT 
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    book_database,
    is_active,
    array_length(allowed_categories, 1) as categories_count,
    array_length(allowed_publication_types, 1) as publication_types_count,
    created_at
FROM public.chatbot_settings
ORDER BY created_at DESC;

-- Detailní informace o jednotlivých chatbotech
SELECT 
    cs.chatbot_id,
    cs.chatbot_name,
    cs.is_active,
    cs.product_recommendations,
    cs.book_database,
    CASE 
        WHEN array_length(cs.allowed_categories, 1) IS NULL THEN '[]'
        ELSE json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL)::text
    END as categories,
    CASE 
        WHEN array_length(cs.allowed_publication_types, 1) IS NULL THEN '[]'
        ELSE json_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL)::text
    END as publication_types
FROM public.chatbot_settings cs
LEFT JOIN public.categories c ON c.id = ANY(cs.allowed_categories)
LEFT JOIN public.publication_types pt ON pt.id = ANY(cs.allowed_publication_types)
GROUP BY cs.chatbot_id, cs.chatbot_name, cs.is_active, cs.product_recommendations, cs.book_database
ORDER BY cs.chatbot_name;




