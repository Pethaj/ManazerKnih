-- ================================================================
-- PŘIDÁNÍ NASTAVENÍ PRO FEED ZDROJE DO CHATBOT_SETTINGS
-- Umožňuje chatbotům vybrat, které feed zdroje mají používat
-- ================================================================

-- Přidání nových sloupců do chatbot_settings
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS use_feed_1 BOOLEAN DEFAULT true;

ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS use_feed_2 BOOLEAN DEFAULT true;

-- Komentáře ke sloupcům
COMMENT ON COLUMN public.chatbot_settings.use_feed_1 IS 'Zda chatbot používá Feed 1 (zbozi.xml) pro produktová doporučení';
COMMENT ON COLUMN public.chatbot_settings.use_feed_2 IS 'Zda chatbot používá Feed 2 (Product Feed 2) pro produktová doporučení';

-- Aktualizace existujících záznamů (nastavíme obě na true jako default)
UPDATE public.chatbot_settings 
SET use_feed_1 = true, use_feed_2 = true
WHERE use_feed_1 IS NULL OR use_feed_2 IS NULL;

-- ================================================================
-- OVĚŘENÍ
-- ================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Sloupce use_feed_1 a use_feed_2 byly přidány do chatbot_settings!';
  RAISE NOTICE 'ℹ️  Defaultní hodnoty: use_feed_1 = true, use_feed_2 = true';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Použití v chatbot nastavení:';
  RAISE NOTICE '   - use_feed_1: true → Použít Feed 1 (zbozi.xml)';
  RAISE NOTICE '   - use_feed_2: true → Použít Feed 2 (Product Feed 2)';
  RAISE NOTICE '   - Oba můžou být true zároveň pro kombinované vyhledávání';
END $$;

-- Zobrazení aktuálního stavu
SELECT 
  chatbot_id, 
  chatbot_name, 
  product_recommendations,
  use_feed_1,
  use_feed_2
FROM public.chatbot_settings
ORDER BY created_at DESC;


