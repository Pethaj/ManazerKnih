-- ================================================================
-- pg_trgm INDEX PRO AUTOCOMPLETE VYHLEDÁVÁNÍ V FEED AGENTOVI
-- 
-- Spusť v Supabase SQL editoru:
-- 1. Nejdřív zkontroluj, zda extension existuje
-- 2. Pak vytvoř GIN index pro rychlé trigram vyhledávání
-- 
-- Po spuštění bude autocomplete dotaz trvat ~50-150ms místo sekund.
-- ================================================================

-- Krok 1: Povolení pg_trgm extension (pokud ještě není)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Krok 2: GIN index na product_name pro trigram vyhledávání
-- (funguje pro překlepy, zkrácené výrazy, podobné názvy)
CREATE INDEX IF NOT EXISTS idx_product_feed_2_name_trgm
  ON public.product_feed_2
  USING gin (product_name gin_trgm_ops);

-- Krok 3: Volitelně i na product_code (pro vyhledávání kódu)
CREATE INDEX IF NOT EXISTS idx_product_feed_2_code_trgm
  ON public.product_feed_2
  USING gin (product_code gin_trgm_ops);

-- ================================================================
-- SUPABASE RPC FUNKCE PRO AUTOCOMPLETE
-- Volá se přímo z feedAgentTools.ts (bez agenta → rychlé!)
-- ================================================================

CREATE OR REPLACE FUNCTION public.autocomplete_products(
  search_query TEXT,
  max_results INTEGER DEFAULT 8
)
RETURNS TABLE (
  product_code  VARCHAR,
  product_name  VARCHAR,
  category      VARCHAR,
  price         DECIMAL,
  currency      VARCHAR,
  thumbnail     TEXT,
  url           TEXT,
  availability  INTEGER,
  similarity    FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.product_code,
    p.product_name,
    p.category,
    p.price,
    p.currency,
    p.thumbnail,
    p.url,
    p.availability,
    -- kombinuje prefix match + trigram similarity
    GREATEST(
      -- prefix bonus: začíná na hledaný výraz (nejrelevantnější)
      CASE WHEN lower(p.product_name) LIKE lower(search_query) || '%' THEN 1.0
           WHEN lower(p.product_name) LIKE '% ' || lower(search_query) || '%' THEN 0.9
           ELSE 0.0
      END,
      -- trigram similarity pro překlepy
      similarity(lower(p.product_name), lower(search_query))
    ) AS similarity
  FROM public.product_feed_2 p
  WHERE
    -- trigram podmínka (používá GIN index → rychlé)
    (
      lower(p.product_name) LIKE lower(search_query) || '%'
      OR lower(p.product_name) LIKE '% ' || lower(search_query) || '%'
      OR p.product_name % search_query  -- trigram operator
      OR p.product_code ILIKE search_query || '%'
    )
  ORDER BY
    similarity DESC,
    p.sales_last_30_days DESC NULLS LAST,
    p.product_name ASC
  LIMIT max_results;
END;
$$;

-- Oprávnění pro volání z frontendu
GRANT EXECUTE ON FUNCTION public.autocomplete_products(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.autocomplete_products(TEXT, INTEGER) TO authenticated;

-- ================================================================
-- OVĚŘENÍ
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ pg_trgm extension a GIN index vytvořeny!';
  RAISE NOTICE '✅ Funkce autocomplete_products() je připravena.';
  RAISE NOTICE '📌 Testuj: SELECT * FROM autocomplete_products(''nohe'', 8);';
END $$;
