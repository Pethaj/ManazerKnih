-- SQL script pro přidání nového chatbota "Vany.chat" do databáze
-- Spusťte tento script v Supabase SQL editoru
-- Nastavení je stejné jako u "Sana Local Format"

-- Přidání Vany.chat chatbota
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
) VALUES 
    (
        'vany_chat', 
        'Vany.chat', 
        'AI asistent s plným přístupem k databázi knih a pokročilým markdown renderingem',
        false,  -- Produktová doporučení vypnuta (stejně jako Sana Local Format)
        false,  -- Produktové tlačítko vypnuto (stejně jako Sana Local Format)
        true,   -- Databáze knih zapnuta (stejně jako Sana Local Format)
        COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'), -- Všechny kategorie (stejně jako Sana Local Format)
        COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}'), -- Všechny typy publikací (stejně jako Sana Local Format)
        true    -- Aktivní
    )
ON CONFLICT (chatbot_id) DO UPDATE SET
    chatbot_name = EXCLUDED.chatbot_name,
    description = EXCLUDED.description,
    product_recommendations = EXCLUDED.product_recommendations,
    product_button_recommendations = EXCLUDED.product_button_recommendations,
    book_database = EXCLUDED.book_database,
    allowed_categories = EXCLUDED.allowed_categories,
    allowed_publication_types = EXCLUDED.allowed_publication_types,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Ověření, že chatbot byl přidán
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
    created_at
FROM public.chatbot_settings 
WHERE chatbot_id = 'vany_chat';
