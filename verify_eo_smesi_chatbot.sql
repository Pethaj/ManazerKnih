-- SQL script pro ověření chatbota "EO-Smesi"
-- Spusťte tento script po přidání chatbota pro kontrolu

-- ============================================================================
-- 1. ZÁKLADNÍ INFO O EO-SMESI
-- ============================================================================

SELECT 
    chatbot_id,
    chatbot_name,
    description,
    is_active,
    created_at,
    updated_at
FROM public.chatbot_settings 
WHERE chatbot_id = 'eo_smesi';

-- ============================================================================
-- 2. KOMPLETNÍ NASTAVENÍ EO-SMESI
-- ============================================================================

SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    product_recommendations,
    product_button_recommendations,
    book_database,
    inline_product_links,
    enable_product_router,
    enable_manual_funnel,
    use_feed_1,
    use_feed_2,
    is_active,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types,
    array_length(allowed_labels, 1) as num_labels
FROM public.chatbot_settings 
WHERE chatbot_id = 'eo_smesi';

-- ============================================================================
-- 3. POROVNÁNÍ: EO-SMESI vs WANY CHAT
-- ============================================================================

SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    product_recommendations,
    book_database,
    enable_product_router,
    is_active,
    array_length(allowed_categories, 1) as categories_count,
    array_length(allowed_publication_types, 1) as pub_types_count
FROM public.chatbot_settings 
WHERE chatbot_id IN ('eo_smesi', 'vany_chat')
ORDER BY chatbot_name;

-- ============================================================================
-- 4. SEZNAM VŠECH AKTIVNÍCH CHATBOTŮ
-- ============================================================================

SELECT 
    chatbot_id,
    chatbot_name,
    LEFT(webhook_url, 60) || '...' as webhook_preview,
    is_active,
    created_at
FROM public.chatbot_settings 
WHERE is_active = true
ORDER BY chatbot_name;

-- ============================================================================
-- 5. KONTROLA KATEGORIÍ PRO EO-SMESI
-- ============================================================================

SELECT 
    cs.chatbot_name,
    array_agg(c.name ORDER BY c.name) as allowed_category_names,
    array_length(cs.allowed_categories, 1) as total_categories
FROM public.chatbot_settings cs
LEFT JOIN public.categories c ON c.id = ANY(cs.allowed_categories)
WHERE cs.chatbot_id = 'eo_smesi'
GROUP BY cs.chatbot_name, cs.allowed_categories;

-- ============================================================================
-- 6. KONTROLA TYPŮ PUBLIKACÍ PRO EO-SMESI
-- ============================================================================

SELECT 
    cs.chatbot_name,
    array_agg(pt.name ORDER BY pt.name) as allowed_publication_type_names,
    array_length(cs.allowed_publication_types, 1) as total_publication_types
FROM public.chatbot_settings cs
LEFT JOIN public.publication_types pt ON pt.id = ANY(cs.allowed_publication_types)
WHERE cs.chatbot_id = 'eo_smesi'
GROUP BY cs.chatbot_name, cs.allowed_publication_types;

-- ============================================================================
-- 7. KONTROLA, ŽE NASTAVENÍ JSOU STEJNÁ JAKO U WANY CHAT
-- ============================================================================

WITH eo_settings AS (
    SELECT 
        product_recommendations,
        product_button_recommendations,
        book_database,
        inline_product_links,
        enable_product_router,
        enable_manual_funnel,
        use_feed_1,
        use_feed_2,
        array_length(allowed_categories, 1) as num_categories,
        array_length(allowed_publication_types, 1) as num_pub_types
    FROM chatbot_settings WHERE chatbot_id = 'eo_smesi'
),
wany_settings AS (
    SELECT 
        product_recommendations,
        product_button_recommendations,
        book_database,
        inline_product_links,
        enable_product_router,
        enable_manual_funnel,
        use_feed_1,
        use_feed_2,
        array_length(allowed_categories, 1) as num_categories,
        array_length(allowed_publication_types, 1) as num_pub_types
    FROM chatbot_settings WHERE chatbot_id = 'vany_chat'
)
SELECT 
    'product_recommendations' as setting,
    eo.product_recommendations as eo_smesi,
    wany.product_recommendations as wany_chat,
    CASE WHEN eo.product_recommendations = wany.product_recommendations THEN '✅ Shodné' ELSE '❌ Rozdílné' END as status
FROM eo_settings eo, wany_settings wany
UNION ALL
SELECT 
    'book_database',
    eo.book_database,
    wany.book_database,
    CASE WHEN eo.book_database = wany.book_database THEN '✅ Shodné' ELSE '❌ Rozdílné' END
FROM eo_settings eo, wany_settings wany
UNION ALL
SELECT 
    'enable_product_router',
    eo.enable_product_router,
    wany.enable_product_router,
    CASE WHEN eo.enable_product_router = wany.enable_product_router THEN '✅ Shodné' ELSE '❌ Rozdílné' END
FROM eo_settings eo, wany_settings wany
UNION ALL
SELECT 
    'num_categories',
    eo.num_categories::boolean,
    wany.num_categories::boolean,
    CASE WHEN eo.num_categories = wany.num_categories THEN '✅ Shodné' ELSE '❌ Rozdílné' END
FROM eo_settings eo, wany_settings wany;

-- ============================================================================
-- 8. FINAL CHECK - VŠECHNO OK?
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM chatbot_settings WHERE chatbot_id = 'eo_smesi' AND is_active = true) 
        THEN '✅ EO-Smesi chatbot je AKTIVNÍ a PŘIPRAVENÝ'
        ELSE '❌ EO-Smesi chatbot NENÍ aktivní nebo NEEXISTUJE'
    END as final_status,
    (SELECT webhook_url FROM chatbot_settings WHERE chatbot_id = 'eo_smesi') as webhook_url,
    (SELECT chatbot_name FROM chatbot_settings WHERE chatbot_id = 'eo_smesi') as chatbot_name;


