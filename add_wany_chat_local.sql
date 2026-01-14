-- SQL script pro přidání nového chatbota "Wany.Chat Local" do databáze
-- Spusťte tento script v Supabase SQL editoru
-- Nastavení je stejné jako u "Wany.Chat", pouze s jiným webhook URL a červenou ikonkou

-- Přidání Wany.Chat Local chatbota
INSERT INTO public.chatbot_settings (
    chatbot_id, 
    chatbot_name, 
    description,
    product_recommendations,
    product_button_recommendations,
    book_database,
    allowed_categories,
    allowed_publication_types,
    webhook_url,
    is_active,
    use_feed_1,
    use_feed_2,
    inline_product_links,
    enable_product_router,
    enable_manual_funnel
) VALUES 
    (
        'wany_chat_local', 
        'Wany.Chat Local', 
        'AI asistent s plným přístupem k databázi knih a pokročilým markdown renderingem - lokální verze',
        false,  -- Produktová doporučení vypnuta (stejně jako Wany.Chat)
        false,  -- Produktové tlačítko vypnuto (stejně jako Wany.Chat)
        true,   -- Databáze knih zapnuta (stejně jako Wany.Chat)
        COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'), -- Všechny kategorie (stejně jako Wany.Chat)
        COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}'), -- Všechny typy publikací (stejně jako Wany.Chat)
        'https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat', -- 🆕 Specifický webhook pro Wany.Chat Local
        true,   -- Aktivní
        true,   -- Použít feed 1 (stejně jako Wany.Chat)
        true,   -- Použít feed 2 (stejně jako Wany.Chat)
        false,  -- Inline produktové linky vypnuty (stejně jako Wany.Chat)
        true,   -- Enable product router (stejně jako Wany.Chat)
        false   -- Manual funnel vypnutý (stejně jako Wany.Chat)
    )
ON CONFLICT (chatbot_id) DO UPDATE SET
    chatbot_name = EXCLUDED.chatbot_name,
    description = EXCLUDED.description,
    product_recommendations = EXCLUDED.product_recommendations,
    product_button_recommendations = EXCLUDED.product_button_recommendations,
    book_database = EXCLUDED.book_database,
    allowed_categories = EXCLUDED.allowed_categories,
    allowed_publication_types = EXCLUDED.allowed_publication_types,
    webhook_url = EXCLUDED.webhook_url,
    is_active = EXCLUDED.is_active,
    use_feed_1 = EXCLUDED.use_feed_1,
    use_feed_2 = EXCLUDED.use_feed_2,
    inline_product_links = EXCLUDED.inline_product_links,
    enable_product_router = EXCLUDED.enable_product_router,
    enable_manual_funnel = EXCLUDED.enable_manual_funnel,
    updated_at = NOW();

-- ✅ OVĚŘENÍ: Zobraz nově přidaný chatbot
SELECT 
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    product_button_recommendations,
    book_database,
    webhook_url,
    is_active,
    use_feed_1,
    use_feed_2,
    inline_product_links,
    enable_product_router,
    enable_manual_funnel,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types,
    created_at,
    updated_at
FROM public.chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';

-- 🔍 POROVNÁNÍ: Zobraz Wany.Chat Local vedle Wany.Chat pro kontrolu
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    product_recommendations,
    book_database,
    is_active,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types
FROM public.chatbot_settings 
WHERE chatbot_id IN ('wany_chat_local', 'vany_chat')
ORDER BY chatbot_name;


