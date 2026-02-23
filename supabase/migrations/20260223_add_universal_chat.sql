-- SQL migrace: přidání chatbota "Chatbot Universal"
-- Chatbot je kopie nastavení Wany chatu s vlastním webhookem
-- Webhook: https://n8n.srv980546.hstgr.cloud/webhook/ca8f84c6-f3af-4a98-ae34-f8b1e031a481/chat

INSERT INTO public.chatbot_settings (
    chatbot_id,
    chatbot_name,
    description,
    product_recommendations,
    product_button_recommendations,
    inline_product_links,
    book_database,
    allowed_categories,
    allowed_publication_types,
    allowed_labels,
    is_active,
    is_default_web_chatbot,
    webhook_url,
    use_feed_1,
    use_feed_2,
    enable_product_router,
    enable_manual_funnel,
    summarize_history,
    allowed_product_categories,
    group_products_by_category,
    show_sources,
    enable_product_pairing
) VALUES (
    'universal_chat',
    'Chatbot Universal',
    'Univerzální AI chatbot s vlastním N8N webhookem',
    false,
    false,
    false,
    false,
    '{}',
    '{}',
    '{}',
    true,
    false,
    'https://n8n.srv980546.hstgr.cloud/webhook/ca8f84c6-f3af-4a98-ae34-f8b1e031a481/chat',
    false,
    false,
    false,
    false,
    false,
    '{}',
    false,
    false,
    false
)
ON CONFLICT (chatbot_id) DO UPDATE SET
    chatbot_name = EXCLUDED.chatbot_name,
    description = EXCLUDED.description,
    product_recommendations = EXCLUDED.product_recommendations,
    product_button_recommendations = EXCLUDED.product_button_recommendations,
    inline_product_links = EXCLUDED.inline_product_links,
    book_database = EXCLUDED.book_database,
    allowed_categories = EXCLUDED.allowed_categories,
    allowed_publication_types = EXCLUDED.allowed_publication_types,
    allowed_labels = EXCLUDED.allowed_labels,
    is_active = EXCLUDED.is_active,
    webhook_url = EXCLUDED.webhook_url,
    use_feed_1 = EXCLUDED.use_feed_1,
    use_feed_2 = EXCLUDED.use_feed_2,
    enable_product_router = EXCLUDED.enable_product_router,
    enable_manual_funnel = EXCLUDED.enable_manual_funnel,
    summarize_history = EXCLUDED.summarize_history,
    allowed_product_categories = EXCLUDED.allowed_product_categories,
    group_products_by_category = EXCLUDED.group_products_by_category,
    show_sources = EXCLUDED.show_sources,
    enable_product_pairing = EXCLUDED.enable_product_pairing,
    updated_at = NOW();

-- Ověření
SELECT
    chatbot_id,
    chatbot_name,
    description,
    webhook_url,
    is_active,
    created_at
FROM public.chatbot_settings
WHERE chatbot_id = 'universal_chat';
