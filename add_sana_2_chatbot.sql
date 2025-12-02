-- SQL script pro přidání nového chatbota "Sana 2" do databáze
-- Spusťte tento script v Supabase SQL editoru

-- Přidání Sana 2 chatbota s markdown renderingem
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
        'sana_2', 
        'Sana 2', 
        'Vylepšená verze Sana chatu s pokročilým markdown renderingem - podporuje tučný text, seznamy, obrázky, emojis, tabulky a code bloky',
        false,  -- Produktová doporučení vypnuta (stejně jako původní Sana)
        false,  -- Produktové tlačítko vypnuto
        true,   -- Databáze knih zapnuta (jako původní Sana)
        COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'), -- Všechny kategorie (jako původní Sana)
        COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}'), -- Všechny typy publikací (jako původní Sana)
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
    array_length(allowed_publication_types, 1) as num_publication_types
FROM public.chatbot_settings 
WHERE chatbot_id = 'sana_2';

