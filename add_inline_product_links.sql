-- ================================================================
-- SQL MIGRACE: Přidání podpory pro Inline Produktové Linky
-- ================================================================
-- Tento script přidává nový sloupec do chatbot_settings tabulky
-- pro podporu funkce inline produktových linků v chatbotu
--
-- Datum: 2025-01-03
-- Funkce: Inline produktové linky (ChatGPT styl)
-- ================================================================

-- Přidání sloupce pro inline produktové linky
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS inline_product_links BOOLEAN DEFAULT false;

-- Vytvoření indexu pro rychlejší dotazy
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_inline_product_links 
ON public.chatbot_settings(inline_product_links) 
WHERE inline_product_links = true;

-- Komentář pro dokumentaci
COMMENT ON COLUMN public.chatbot_settings.inline_product_links IS 
'Pokud true, chatbot bude automaticky detekovat produkty v odpovědích a zobrazí inline linky (ChatGPT styl). Používá vektorové vyhledávání v product_embeddings a obohacení z product_feed_2.';

-- Ověření úspěchu
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chatbot_settings' 
        AND column_name = 'inline_product_links'
    ) THEN
        RAISE NOTICE '✅ Sloupec inline_product_links byl úspěšně přidán';
    ELSE
        RAISE EXCEPTION '❌ Sloupec inline_product_links nebyl přidán';
    END IF;
END $$;

-- Výpis aktuálního stavu chatbot_settings tabulky
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
