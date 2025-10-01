-- ================================================================
-- KOMPLETNÍ RAG SYSTÉM PRO PRODUKTOVÉ VYHLEDÁVÁNÍ
-- Založeno na Supabase dokumentaci: Hybrid Search
-- ================================================================

-- Vyčistíme staré funkce
DROP FUNCTION IF EXISTS public.search_products_by_vector(vector, float, integer) CASCADE;
DROP FUNCTION IF EXISTS public.hybrid_product_search(text, vector, integer, float, float, integer) CASCADE;

-- ================================================================
-- 1. ZÁKLADNÍ VEKTOROVÁ FUNKCE (PURE SEMANTIC SEARCH)
-- ================================================================
CREATE OR REPLACE FUNCTION public.search_products_by_vector(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
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
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.product_code,
    pe.product_name,
    pe.description,
    pe.category,
    pe.price,
    pe.product_url,
    pe.image_url,
    pe.currency,
    (1 - (pe.embedding <=> query_embedding)) AS similarity_score
  FROM public.product_embeddings pe
  WHERE pe.embedding IS NOT NULL
    AND pe.embedding_status = 'completed'
    AND (1 - (pe.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY pe.embedding <=> query_embedding ASC, pe.ranking_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 2. HYBRIDNÍ VYHLEDÁVÁNÍ (KEYWORD + SEMANTIC)
-- ================================================================
CREATE OR REPLACE FUNCTION public.hybrid_product_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 10,
  full_text_weight FLOAT DEFAULT 1,
  semantic_weight FLOAT DEFAULT 1,
  rrf_k INTEGER DEFAULT 50
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
  combined_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH full_text AS (
    SELECT
      pe.product_code,
      pe.product_name,
      pe.description,
      pe.category,
      pe.price,
      pe.product_url,
      pe.image_url,
      pe.currency,
      -- Použijeme ts_rank_cd pro ranking
      ts_rank_cd(to_tsvector('simple', unaccent(coalesce(pe.search_text, ''))), websearch_to_tsquery('simple', unaccent(query_text))) as keyword_score,
      row_number() over(
        order by ts_rank_cd(to_tsvector('simple', unaccent(coalesce(pe.search_text, ''))), websearch_to_tsquery('simple', unaccent(query_text))) desc
      ) as rank_ix
    FROM public.product_embeddings pe
    WHERE to_tsvector('simple', unaccent(coalesce(pe.search_text, ''))) @@ websearch_to_tsquery('simple', unaccent(query_text))
    ORDER BY rank_ix
    LIMIT least(match_count, 30) * 2
  ),
  semantic AS (
    SELECT
      pe.product_code,
      pe.product_name,
      pe.description,
      pe.category,
      pe.price,
      pe.product_url,
      pe.image_url,
      pe.currency,
      (1 - (pe.embedding <=> query_embedding)) as similarity_score,
      row_number() over (order by pe.embedding <=> query_embedding) as rank_ix
    FROM public.product_embeddings pe
    WHERE pe.embedding IS NOT NULL
      AND pe.embedding_status = 'completed'
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
    coalesce(semantic.similarity_score, 0.0) as similarity_score,
    coalesce(full_text.rank_ix, 0)::INTEGER as keyword_rank,
    coalesce(semantic.rank_ix, 0)::INTEGER as semantic_rank,
    -- Reciprocal Rank Fusion (RRF) scoring
    (
      coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
      coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight
    ) as combined_score
  FROM full_text
  FULL OUTER JOIN semantic ON full_text.product_code = semantic.product_code
  ORDER BY combined_score DESC
  LIMIT least(match_count, 30);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 3. JEDNODUCHÁ FUNKCE PRO RAG CHUNKS
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_product_chunks_for_rag(
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.6,
  max_chunks INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_text TEXT,
  product_info JSONB,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Vytvoříme "chunk" z produktových dat
    CONCAT(
      'Produkt: ', pe.product_name, 
      CASE WHEN pe.description IS NOT NULL AND pe.description != '' 
           THEN CONCAT('. Popis: ', pe.description) 
           ELSE '' END,
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
      'image_url', pe.image_url
    ) as product_info,
    (1 - (pe.embedding <=> query_embedding)) as similarity_score
  FROM public.product_embeddings pe
  WHERE pe.embedding IS NOT NULL
    AND pe.embedding_status = 'completed'
    AND (1 - (pe.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY pe.embedding <=> query_embedding ASC
  LIMIT max_chunks;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- OPRÁVNĚNÍ
-- ================================================================
GRANT EXECUTE ON FUNCTION public.search_products_by_vector(VECTOR(1536), FLOAT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_products_by_vector(VECTOR(1536), FLOAT, INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.hybrid_product_search(TEXT, VECTOR(1536), INTEGER, FLOAT, FLOAT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.hybrid_product_search(TEXT, VECTOR(1536), INTEGER, FLOAT, FLOAT, INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_product_chunks_for_rag(VECTOR(1536), FLOAT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_product_chunks_for_rag(VECTOR(1536), FLOAT, INTEGER) TO authenticated;

-- ================================================================
-- KOMENTÁŘE
-- ================================================================
COMMENT ON FUNCTION public.search_products_by_vector IS 'Čisté vektorové vyhledávání produktů podle embedding similarity';
COMMENT ON FUNCTION public.hybrid_product_search IS 'Hybridní vyhledávání kombinující keyword a semantic search s RRF';
COMMENT ON FUNCTION public.get_product_chunks_for_rag IS 'Získání produktových chunků pro RAG systém';

-- ================================================================
-- TESTOVÁNÍ
-- ================================================================
-- Test vektorové funkce s random vektorem
-- SELECT * FROM search_products_by_vector(
--   (SELECT ARRAY_AGG(random() - 0.5)::vector(1536) FROM generate_series(1, 1536)),
--   0.1, 
--   5
-- );
