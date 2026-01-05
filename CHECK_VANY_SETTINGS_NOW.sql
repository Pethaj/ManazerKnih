-- URGENT: Kontrola nastavení vany_chat
-- Spusť tento SQL dotaz v Supabase SQL editoru HNED

-- 1. Jaké kategorie má vany_chat povolené (ID)?
SELECT 
    chatbot_id,
    chatbot_name,
    allowed_categories as category_ids,
    array_length(allowed_categories, 1) as pocet_kategorii
FROM public.chatbot_settings 
WHERE chatbot_id = 'vany_chat';

-- 2. Jaké kategorie to jsou (názvy)?
SELECT 
    cs.chatbot_id,
    c.id as category_id,
    c.name as category_name
FROM public.chatbot_settings cs
CROSS JOIN LATERAL unnest(cs.allowed_categories) as allowed_cat_id
JOIN public.categories c ON c.id = allowed_cat_id
WHERE cs.chatbot_id = 'vany_chat'
ORDER BY c.name;

-- 3. Pro srovnání - všechny existující kategorie
SELECT 
    id,
    name,
    CASE 
        WHEN id = ANY((SELECT allowed_categories FROM chatbot_settings WHERE chatbot_id = 'vany_chat'))
        THEN '✅ POVOLENO'
        ELSE '❌ NEPOVOLENO'
    END as status_pro_vany_chat
FROM public.categories
ORDER BY name;















