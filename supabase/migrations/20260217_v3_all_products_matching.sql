-- ================================================================
-- MIGRACE V3.0: Rozšíření get_products_with_pinyin_names()
-- Datum: 2026-02-17
-- Popis: Vrací VŠECHNY produkty, ne jen ty s **pinyin** formátem
-- ================================================================

-- Funkce vrací všechny produkty z product_feed_2 s dynamicky generovaným pinyin_name
-- 🆕 V3.0: Vrací VŠECHNY produkty, ne jen ty s **pinyin** formátem
--          Pro produkty bez pinyin formátu se použije product_name
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
    -- Pokud má **pinyin** formát, extrahuj ho, jinak použij product_name
    COALESCE(
      trim(regexp_replace(
        (regexp_match(pf2.description_short, '^\*\*([^*]+)\*\*'))[1],
        '^[0-9]+\s*[–-]?\s*',
        ''
      )),
      pf2.product_name
    ) as pinyin_name,
    pf2.url,
    pf2.category
  FROM public.product_feed_2 pf2
  WHERE pf2.url IS NOT NULL  -- Pouze produkty s URL
  ORDER BY pf2.id;
END;
$$ LANGUAGE plpgsql;

-- Oprávnění pro funkci
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO authenticated;

-- Test: Zkontrolovat, že "No esenciální olej" je nyní vrácen
-- SELECT * FROM get_products_with_pinyin_names() 
-- WHERE product_name ILIKE '%no esenciální%'
-- LIMIT 10;

-- Poznámky:
-- - DŮLEŽITÉ: Tato změna zvyšuje počet vrácených produktů z ~1000 na ~2500
-- - Důvod: Směsi EO a některé jiné produkty NEMAJÍ **pinyin** formát
-- - Řešení: Category-based filtering v productNameMatchingService.ts v3.0
