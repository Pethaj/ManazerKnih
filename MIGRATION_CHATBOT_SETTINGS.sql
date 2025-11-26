-- ================================================================
-- KOMPLETNÍ MIGRACE PRO CHATBOT SETTINGS
-- Tento script přidá všechny chybějící sloupce do tabulky chatbot_settings
-- ================================================================

-- =====================================================
-- KROK 1: Přidání sloupce product_button_recommendations
-- =====================================================
ALTER TABLE public.chatbot_settings
ADD COLUMN IF NOT EXISTS product_button_recommendations BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.chatbot_settings.product_button_recommendations IS 
'Produktové doporučení na tlačítko - zobrazí tlačítko "Doporučit produkty" na konci odpovědi chatbota';

-- Nastavení výchozích hodnot pro existující chatboty
UPDATE public.chatbot_settings
SET product_button_recommendations = false
WHERE product_button_recommendations IS NULL;

-- =====================================================
-- KROK 2: Přidání sloupců use_feed_1 a use_feed_2
-- =====================================================
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS use_feed_1 BOOLEAN DEFAULT true;

ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS use_feed_2 BOOLEAN DEFAULT true;

-- Komentáře ke sloupcům
COMMENT ON COLUMN public.chatbot_settings.use_feed_1 IS 
'Zda chatbot používá Feed 1 (zbozi.xml) pro produktová doporučení';

COMMENT ON COLUMN public.chatbot_settings.use_feed_2 IS 
'Zda chatbot používá Feed 2 (Product Feed 2) pro produktová doporučení';

-- Aktualizace existujících záznamů (nastavíme obě na true jako default)
UPDATE public.chatbot_settings 
SET use_feed_1 = true, use_feed_2 = true
WHERE use_feed_1 IS NULL OR use_feed_2 IS NULL;

-- =====================================================
-- KROK 3: Validace a kontrola
-- =====================================================

-- Zkontroluj, že všechny sloupce byly úspěšně přidány
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'chatbot_settings' 
    AND column_name IN (
        'product_button_recommendations',
        'use_feed_1',
        'use_feed_2'
    )
ORDER BY column_name;

-- Zobraz aktuální nastavení všech chatbotů
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,
    book_database,
    use_feed_1,
    use_feed_2,
    is_active,
    created_at
FROM public.chatbot_settings
ORDER BY chatbot_id;

-- =====================================================
-- OVĚŘENÍ - Výpis stavu
-- =====================================================
DO $$ 
DECLARE
  chatbot_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO chatbot_count FROM public.chatbot_settings;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ================================================================';
  RAISE NOTICE '✅ MIGRACE CHATBOT_SETTINGS DOKONČENA!';
  RAISE NOTICE '✅ ================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Celkový počet chatbotů: %', chatbot_count;
  RAISE NOTICE '';
  RAISE NOTICE '🆕 Nově přidané sloupce:';
  RAISE NOTICE '   1. product_button_recommendations (BOOLEAN, default: false)';
  RAISE NOTICE '   2. use_feed_1 (BOOLEAN, default: true)';
  RAISE NOTICE '   3. use_feed_2 (BOOLEAN, default: true)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Použití:';
  RAISE NOTICE '   - product_button_recommendations: Zobrazí tlačítko pro produktové doporučení na konci odpovědi';
  RAISE NOTICE '   - use_feed_1: Použít Feed 1 (zbozi.xml) pro produktová doporučení';
  RAISE NOTICE '   - use_feed_2: Použít Feed 2 (Product Feed 2) pro produktová doporučení';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Další kroky:';
  RAISE NOTICE '   1. Restartujte frontend aplikaci';
  RAISE NOTICE '   2. Otevřete Správu chatbotů';
  RAISE NOTICE '   3. Nastavte funkce pro jednotlivé chatboty';
  RAISE NOTICE '   4. Uložte změny';
  RAISE NOTICE '   5. Otestujte chat s novými funkcemi';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ================================================================';
END $$;

-- =====================================================
-- KONEC MIGRACE
-- =====================================================

