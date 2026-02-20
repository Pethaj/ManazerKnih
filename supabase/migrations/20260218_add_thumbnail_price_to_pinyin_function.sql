-- ================================================================
-- MIGRACE: Rozšíření get_products_with_pinyin_names() o thumbnail, price, currency
-- Datum: 2026-02-18
-- Popis: Přidává thumbnail, price, currency pro zobrazení v Product Pills
-- ================================================================

-- Funkce vrací všechny produkty z product_feed_2 s dynamicky generovaným pinyin_name
-- + thumbnail, price, currency pro zobrazení v UI
CREATE OR REPLACE FUNCTION public.get_products_with_pinyin_names()
RETURNS TABLE (
  id BIGINT,
  product_code VARCHAR,
  product_name VARCHAR,
  description_short TEXT,
  pinyin_name TEXT,
  url TEXT,
  category TEXT,
  thumbnail TEXT,
  price NUMERIC,
  currency VARCHAR
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
    pf2.category,
    pf2.thumbnail,
    pf2.price,
    pf2.currency
  FROM public.product_feed_2 pf2
  WHERE pf2.url IS NOT NULL  -- Pouze produkty s URL
  ORDER BY pf2.id;
END;
$$ LANGUAGE plpgsql;

-- Oprávnění pro funkci
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO authenticated;

-- Test: Zkontrolovat, že se vrací i thumbnail, price, currency
-- SELECT * FROM get_products_with_pinyin_names() 
-- WHERE product_name ILIKE '%move it%'
-- LIMIT 5;
