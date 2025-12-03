-- Ověření, že sloupec inline_product_links existuje
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chatbot_settings' 
AND column_name = 'inline_product_links';

-- Ověření hodnot v chatbot_settings
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,
    inline_product_links,
    book_database,
    is_active
FROM public.chatbot_settings
ORDER BY created_at DESC;


