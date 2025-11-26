-- ================================================================
-- AKTUALIZACE HYBRIDNÍCH VYHLEDÁVACÍCH FUNKCÍ PRO FEED 2
-- Přidání podpory pro feed_source filtrování
-- ================================================================

-- ================================================================
-- 1. AKTUALIZACE ČISTĚ VEKTOROVÉHO VYHLEDÁVÁNÍ
-- ================================================================
CREATE OR REPLACE FUNCTION public.search_products_by_vector(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10,
  filter_feed_source VARCHAR DEFAULT NULL  -- Nový parametr pro filtrování
)
RETURNS TABLE (
  product_code VARCHAR,
  product_name VARCHAR,
  description TEXT,
  category VARCHAR,
  price DECIMAL,
  product_url VARCHAR,
  image_url VARCHAR,
  currency VARCHAR,
  similarity_score FLOAT,
  feed_source VARCHAR  -- Přidáno do výstupu
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.product_code,
    pe.product_name,
    COALESCE(pe.description_long, pe.description) as description,
    pe.category,
    pe.price,
    pe.product_url,
    pe.image_url,
    pe.currency,
    (1 - (pe.embedding <=> query_embedding)) AS similarity_score,
    pe.feed_source
  FROM public.product_embeddings pe
  WHERE pe.embedding IS NOT NULL
    AND pe.embedding_status = 'completed'
    AND (1 - (pe.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
  ORDER BY pe.embedding <=> query_embedding ASC, pe.ranking_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 2. AKTUALIZACE HYBRIDNÍHO VYHLEDÁVÁNÍ
-- ================================================================
CREATE OR REPLACE FUNCTION public.hybrid_product_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 10,
  full_text_weight FLOAT DEFAULT 1,
  semantic_weight FLOAT DEFAULT 1,
  rrf_k INTEGER DEFAULT 50,
  filter_feed_source VARCHAR DEFAULT NULL  -- Nový parametr
)
RETURNS TABLE (
  product_code VARCHAR,
  product_name VARCHAR,
  description TEXT,
  category VARCHAR,
  price DECIMAL,
  product_url VARCHAR,
  image_url VARCHAR,
  currency VARCHAR,
  similarity_score FLOAT,
  keyword_rank INTEGER,
  semantic_rank INTEGER,
  combined_score FLOAT,
  feed_source VARCHAR  -- Přidáno do výstupu
) AS $$
BEGIN
  RETURN QUERY
  WITH full_text AS (
    SELECT
      pe.product_code,
      pe.product_name,
      COALESCE(pe.description_long, pe.description) as description,
      pe.category,
      pe.price,
      pe.product_url,
      pe.image_url,
      pe.currency,
      pe.feed_source,
      ts_rank_cd(to_tsvector('simple', unaccent(coalesce(pe.search_text, ''))), websearch_to_tsquery('simple', unaccent(query_text))) as keyword_score,
      row_number() over(
        order by ts_rank_cd(to_tsvector('simple', unaccent(coalesce(pe.search_text, ''))), websearch_to_tsquery('simple', unaccent(query_text))) desc
      ) as rank_ix
    FROM public.product_embeddings pe
    WHERE to_tsvector('simple', unaccent(coalesce(pe.search_text, ''))) @@ websearch_to_tsquery('simple', unaccent(query_text))
      AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
    ORDER BY rank_ix
    LIMIT least(match_count, 30) * 2
  ),
  semantic AS (
    SELECT
      pe.product_code,
      pe.product_name,
      COALESCE(pe.description_long, pe.description) as description,
      pe.category,
      pe.price,
      pe.product_url,
      pe.image_url,
      pe.currency,
      pe.feed_source,
      (1 - (pe.embedding <=> query_embedding)) as similarity_score,
      row_number() over (order by pe.embedding <=> query_embedding) as rank_ix
    FROM public.product_embeddings pe
    WHERE pe.embedding IS NOT NULL
      AND pe.embedding_status = 'completed'
      AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
    ORDER BY rank_ix
    LIMIT least(match_count, 30) * 2
  )
  SELECT
    coalesce(full_text.product_code, semantic.product_code) as product_code,
    coalesce(full_text.product_name, semantic.product_name) as product_name,
    coalesce(full_text.description, semantic.description) as description,
    coalesce(full_text.category, semantic.category) as category,
    coalesce(full_text.price, semantic.price) as price,
    coalesce(full_text.product_url, semantic.product_url) as product_url,
    coalesce(full_text.image_url, semantic.image_url) as image_url,
    coalesce(full_text.currency, semantic.currency) as currency,
    coalesce(semantic.similarity_score, 0.0)::FLOAT as similarity_score,
    coalesce(full_text.rank_ix::INTEGER, 999999) as keyword_rank,
    coalesce(semantic.rank_ix::INTEGER, 999999) as semantic_rank,
    -- RRF combined score
    coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
    coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight as combined_score,
    coalesce(full_text.feed_source, semantic.feed_source) as feed_source
  FROM full_text
  FULL OUTER JOIN semantic ON full_text.product_code = semantic.product_code
  ORDER BY combined_score DESC
  LIMIT least(match_count, 30);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 3. AKTUALIZACE RAG FUNKCE PRO CHUNKY
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_product_chunks_for_rag(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  max_chunks INTEGER DEFAULT 5,
  filter_feed_source VARCHAR DEFAULT NULL  -- Nový parametr
)
RETURNS TABLE (
  chunk_text TEXT,
  product_info JSONB,
  similarity_score FLOAT,
  feed_source VARCHAR  -- Přidáno do výstupu
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Vytvoříme "chunk" z produktových dat
    CONCAT(
      'Produkt: ', pe.product_name, 
      CASE WHEN pe.description_short IS NOT NULL AND pe.description_short != '' 
           THEN CONCAT('. Krátký popis: ', pe.description_short) 
           ELSE '' END,
      CASE WHEN pe.description_long IS NOT NULL AND pe.description_long != '' 
           THEN CONCAT('. Detailní popis: ', pe.description_long) 
           ELSE CASE WHEN pe.description IS NOT NULL AND pe.description != '' 
                THEN CONCAT('. Popis: ', pe.description) 
                ELSE '' END END,
      CASE WHEN pe.category IS NOT NULL AND pe.category != '' 
           THEN CONCAT('. Kategorie: ', pe.category) 
           ELSE '' END,
      CASE WHEN pe.price IS NOT NULL 
           THEN CONCAT('. Cena: ', pe.price, ' ', pe.currency) 
           ELSE '' END
    ) as chunk_text,
    -- Metadata jako JSON
    jsonb_build_object(
      'product_code', pe.product_code,
      'product_name', pe.product_name,
      'category', pe.category,
      'price', pe.price,
      'currency', pe.currency,
      'product_url', pe.product_url,
      'image_url', pe.image_url,
      'feed_source', pe.feed_source
    ) as product_info,
    (1 - (pe.embedding <=> query_embedding)) as similarity_score,
    pe.feed_source
  FROM public.product_embeddings pe
  WHERE pe.embedding IS NOT NULL
    AND pe.embedding_status = 'completed'
    AND (1 - (pe.embedding <=> query_embedding)) >= similarity_threshold
    AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
  ORDER BY pe.embedding <=> query_embedding ASC
  LIMIT max_chunks;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 4. NOVÁ FUNKCE - VYHLEDÁVÁNÍ VE SPECIFICKÉM FEED ZDROJI
-- ================================================================
CREATE OR REPLACE FUNCTION public.search_products_by_feed(
  feed_source_filter VARCHAR,
  search_query TEXT DEFAULT NULL,
  limit_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  product_code VARCHAR,
  product_name VARCHAR,
  description TEXT,
  category VARCHAR,
  price DECIMAL,
  currency VARCHAR,
  url VARCHAR,
  thumbnail VARCHAR,
  availability INTEGER,
  in_action INTEGER,
  sales_last_30_days INTEGER,
  feed_source VARCHAR
) AS $$
BEGIN
  IF feed_source_filter = 'feed_2' THEN
    -- Vyhledávání v product_feed_2
    RETURN QUERY
    SELECT
      pf2.product_code,
      pf2.product_name,
      pf2.description_short as description,
      pf2.category,
      pf2.price,
      pf2.currency,
      pf2.url,
      pf2.thumbnail,
      pf2.availability,
      pf2.in_action,
      pf2.sales_last_30_days,
      'feed_2'::VARCHAR as feed_source
    FROM public.product_feed_2 pf2
    WHERE (search_query IS NULL OR 
           pf2.product_name ILIKE '%' || search_query || '%' OR
           pf2.description_short ILIKE '%' || search_query || '%' OR
           pf2.category ILIKE '%' || search_query || '%')
    ORDER BY pf2.sales_last_30_days DESC NULLS LAST, pf2.product_name ASC
    LIMIT limit_results;
  ELSE
    -- Vyhledávání v products (feed_1)
    RETURN QUERY
    SELECT
      p.product_code,
      p.name as product_name,
      p.description,
      p.category,
      p.price,
      p.currency,
      p.product_url as url,
      p.image_url as thumbnail,
      p.availability,
      0 as in_action,
      0 as sales_last_30_days,
      'feed_1'::VARCHAR as feed_source
    FROM public.products p
    WHERE (search_query IS NULL OR 
           p.name ILIKE '%' || search_query || '%' OR
           p.description ILIKE '%' || search_query || '%' OR
           p.category ILIKE '%' || search_query || '%')
    ORDER BY p.name ASC
    LIMIT limit_results;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- OPRÁVNĚNÍ
-- ================================================================
GRANT EXECUTE ON FUNCTION public.search_products_by_vector(VECTOR(1536), FLOAT, INTEGER, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.search_products_by_vector(VECTOR(1536), FLOAT, INTEGER, VARCHAR) TO authenticated;

GRANT EXECUTE ON FUNCTION public.hybrid_product_search(TEXT, VECTOR(1536), INTEGER, FLOAT, FLOAT, INTEGER, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.hybrid_product_search(TEXT, VECTOR(1536), INTEGER, FLOAT, FLOAT, INTEGER, VARCHAR) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_product_chunks_for_rag(VECTOR(1536), FLOAT, INTEGER, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.get_product_chunks_for_rag(VECTOR(1536), FLOAT, INTEGER, VARCHAR) TO authenticated;

GRANT EXECUTE ON FUNCTION public.search_products_by_feed(VARCHAR, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_products_by_feed(VARCHAR, TEXT, INTEGER) TO authenticated;

-- ================================================================
-- STATISTIKY A TEST
-- ================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ SQL funkce pro hybridní vyhledávání byly aktualizovány!';
  RAISE NOTICE '📊 Nové funkce:';
  RAISE NOTICE '   - search_products_by_vector() - s feed_source filtrem';
  RAISE NOTICE '   - hybrid_product_search() - s feed_source filtrem';
  RAISE NOTICE '   - get_product_chunks_for_rag() - s feed_source filtrem';
  RAISE NOTICE '   - search_products_by_feed() - nová funkce pro vyhledávání podle feedu';
END $$;





