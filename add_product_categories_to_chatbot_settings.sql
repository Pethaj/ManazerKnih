-- =====================================================
-- Přidání filtrování produktových kategorií do chatbot_settings
-- =====================================================
-- Datum: 2026-02-16
-- Popis: Umožňuje chatbotům filtrovat Product Pills podle konkrétních kategorií z product_feed_2
-- =====================================================

-- 1. Přidání nového sloupce pro povolené produktové kategorie
ALTER TABLE chatbot_settings 
ADD COLUMN IF NOT EXISTS allowed_product_categories TEXT[] DEFAULT '{}';

-- 2. Komentář ke sloupci
COMMENT ON COLUMN chatbot_settings.allowed_product_categories IS 
'Pole obsahující názvy kategorií z product_feed_2, ze kterých mohou pocházet Product Pills. Prázdné pole = všechny kategorie povoleny.';

-- 3. Index pro rychlejší vyhledávání (GIN index pro pole)
CREATE INDEX IF NOT EXISTS idx_chatbot_settings_product_categories 
ON chatbot_settings USING GIN (allowed_product_categories);

-- =====================================================
-- Aktualizace SQL funkcí pro filtrování podle kategorií
-- =====================================================

-- 4. Aktualizace funkce search_products_by_vector s category filtrem
CREATE OR REPLACE FUNCTION search_products_by_vector(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.5,
  max_results int DEFAULT 10,
  filter_feed_source text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL  -- 🆕 Nový parametr
)
RETURNS TABLE (
  product_code text,
  product_name text,
  category text,
  similarity float,
  feed_source text,
  chunk_content text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.product_code,
    pe.product_name,
    pe.category,
    (1 - (pe.embedding <=> query_embedding)) as similarity,
    pe.feed_source,
    pe.chunk_content
  FROM product_embeddings pe
  WHERE 
    (pe.embedding <=> query_embedding) < (1 - similarity_threshold)
    -- Filtrování podle feed_source
    AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
    -- 🆕 Filtrování podle kategorií (pokud jsou zadány)
    AND (
      filter_categories IS NULL 
      OR array_length(filter_categories, 1) IS NULL 
      OR array_length(filter_categories, 1) = 0
      OR pe.category = ANY(filter_categories)
    )
  ORDER BY pe.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 5. Aktualizace funkce hybrid_product_search s category filtrem
CREATE OR REPLACE FUNCTION hybrid_product_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  full_text_weight float DEFAULT 1.0,
  semantic_weight float DEFAULT 1.0,
  rrf_k int DEFAULT 50,
  filter_feed_source text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL  -- 🆕 Nový parametr
)
RETURNS TABLE (
  product_code text,
  product_name text,
  category text,
  combined_score float,
  feed_source text,
  chunk_content text
) AS $$
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    SELECT 
      pe.product_code,
      pe.product_name,
      pe.category,
      pe.feed_source,
      pe.chunk_content,
      ROW_NUMBER() OVER (ORDER BY pe.embedding <=> query_embedding) AS rank
    FROM product_embeddings pe
    WHERE 
      (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
      -- 🆕 Filtrování podle kategorií
      AND (
        filter_categories IS NULL 
        OR array_length(filter_categories, 1) IS NULL 
        OR array_length(filter_categories, 1) = 0
        OR pe.category = ANY(filter_categories)
      )
    ORDER BY pe.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  full_text_search AS (
    SELECT 
      pe.product_code,
      pe.product_name,
      pe.category,
      pe.feed_source,
      pe.chunk_content,
      ROW_NUMBER() OVER (ORDER BY ts_rank(pe.search_text, websearch_to_tsquery('simple', query_text)) DESC) AS rank
    FROM product_embeddings pe
    WHERE 
      pe.search_text @@ websearch_to_tsquery('simple', query_text)
      AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
      -- 🆕 Filtrování podle kategorií
      AND (
        filter_categories IS NULL 
        OR array_length(filter_categories, 1) IS NULL 
        OR array_length(filter_categories, 1) = 0
        OR pe.category = ANY(filter_categories)
      )
    ORDER BY ts_rank(pe.search_text, websearch_to_tsquery('simple', query_text)) DESC
    LIMIT match_count * 2
  ),
  combined_results AS (
    SELECT 
      COALESCE(ss.product_code, fts.product_code) AS product_code,
      COALESCE(ss.product_name, fts.product_name) AS product_name,
      COALESCE(ss.category, fts.category) AS category,
      COALESCE(ss.feed_source, fts.feed_source) AS feed_source,
      COALESCE(ss.chunk_content, fts.chunk_content) AS chunk_content,
      (
        COALESCE(semantic_weight / (rrf_k + ss.rank), 0.0) +
        COALESCE(full_text_weight / (rrf_k + fts.rank), 0.0)
      ) AS combined_score
    FROM semantic_search ss
    FULL OUTER JOIN full_text_search fts ON ss.product_code = fts.product_code
  )
  SELECT 
    cr.product_code,
    cr.product_name,
    cr.category,
    cr.combined_score,
    cr.feed_source,
    cr.chunk_content
  FROM combined_results cr
  ORDER BY cr.combined_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Aktualizace funkce get_product_chunks_for_rag s category filtrem
CREATE OR REPLACE FUNCTION get_product_chunks_for_rag(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_feed_source text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL  -- 🆕 Nový parametr
)
RETURNS TABLE (
  product_code text,
  product_name text,
  category text,
  chunk_content text,
  similarity float,
  feed_source text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.product_code,
    pe.product_name,
    pe.category,
    pe.chunk_content,
    (1 - (pe.embedding <=> query_embedding)) as similarity,
    pe.feed_source
  FROM product_embeddings pe
  WHERE 
    (1 - (pe.embedding <=> query_embedding)) > match_threshold
    AND (filter_feed_source IS NULL OR pe.feed_source = filter_feed_source)
    -- 🆕 Filtrování podle kategorií
    AND (
      filter_categories IS NULL 
      OR array_length(filter_categories, 1) IS NULL 
      OR array_length(filter_categories, 1) = 0
      OR pe.category = ANY(filter_categories)
    )
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Pomocná funkce pro získání všech kategorií z product_feed_2
-- =====================================================
CREATE OR REPLACE FUNCTION get_product_feed_2_categories()
RETURNS TABLE (
  category text,
  product_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pf2.category,
    COUNT(*) as product_count
  FROM product_feed_2 pf2
  WHERE pf2.category IS NOT NULL
  GROUP BY pf2.category
  ORDER BY pf2.category ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_feed_2_categories() IS 
'Vrací seznam všech unikátních kategorií z product_feed_2 s počtem produktů v každé kategorii';

-- =====================================================
-- HOTOVO!
-- =====================================================
-- Nyní můžete:
-- 1. V chatbot_settings nastavit allowed_product_categories jako pole kategorií
-- 2. Volat SQL funkce s parametrem filter_categories
-- 3. Použít get_product_feed_2_categories() pro načtení seznamu kategorií do UI
-- =====================================================
