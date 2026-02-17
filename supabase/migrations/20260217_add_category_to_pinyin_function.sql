-- ================================================================
-- MIGRACE: Přidání kategorie do get_products_with_pinyin_names()
-- Datum: 2026-02-17
-- Popis: Rozšíření funkce o kategorii pro lepší matching směsí EO
-- ================================================================

-- Funkce vrací všechny produkty z product_feed_2 s dynamicky generovaným pinyin_name
-- 🆕 NOVĚ: Vrací také kategorii pro rozpoznání směsí esenciálních olejů
CREATE OR REPLACE FUNCTION public.get_products_with_pinyin_names()
RETURNS TABLE (
  id BIGINT,
  product_code VARCHAR,
  product_name VARCHAR,
  description_short TEXT,
  pinyin_name TEXT,
  url TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pf2.id,
    pf2.product_code,
    pf2.product_name,
    pf2.description_short,
    trim(regexp_replace(
      (regexp_match(pf2.description_short, '^\*\*([^*]+)\*\*'))[1],
      '^[0-9]+\s*[–-]?\s*',
      ''
    )) as pinyin_name,
    pf2.url,
    pf2.category
  FROM public.product_feed_2 pf2
  WHERE pf2.description_short ~ '^\*\*[^*]+\*\*'
    AND pf2.url IS NOT NULL
  ORDER BY pf2.id;
END;
$$ LANGUAGE plpgsql;

-- Oprávnění pro funkci
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO authenticated;

-- Test funkce pro směsi EO
-- SELECT * FROM get_products_with_pinyin_names() 
-- WHERE category ILIKE '%směs%' AND category ILIKE '%esenciální%'
-- LIMIT 10;

-- Poznámky:
-- - Kategorie se nyní používá v productNameMatchingService.ts
-- - Pro směsi esenciálních olejů se matching upravuje (ignoruje suffix "esenciální olej")
-- - Zvyšuje to přesnost párování produktů jako "NOHEPA" → "NOHEPA esenciální olej"
