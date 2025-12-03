-- ================================================================
-- SQL FUNKCE PRO MATCHING PRODUKTŮ S PINYIN NAMES
-- ================================================================

-- Funkce vrací všechny produkty z product_feed_2 s dynamicky generovaným pinyin_name
CREATE OR REPLACE FUNCTION public.get_products_with_pinyin_names()
RETURNS TABLE (
  id BIGINT,
  product_code VARCHAR,
  product_name VARCHAR,
  description_short TEXT,
  pinyin_name TEXT,
  url TEXT
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
    pf2.url
  FROM public.product_feed_2 pf2
  WHERE pf2.description_short ~ '^\*\*[^*]+\*\*'
    AND pf2.url IS NOT NULL
  ORDER BY pf2.id;
END;
$$ LANGUAGE plpgsql;

-- Oprávnění pro funkci
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO authenticated;

-- Test funkce
-- SELECT * FROM get_products_with_pinyin_names() LIMIT 10;


