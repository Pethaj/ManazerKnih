-- ================================================================
-- OPRAVA VEKTOROVÉHO VYHLEDÁVÁNÍ - VYTVOŘENÍ CHYBĚJÍCÍ RPC FUNKCE
-- ================================================================

-- Nejprve zkontrolujeme, zda máme pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Vytvoříme funkci pro vektorové vyhledávání
-- POZOR: Parametry musí být ve správném pořadí podle chybové hlášky
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

-- Nastavíme oprávnění pro funkci
GRANT EXECUTE ON FUNCTION public.search_products_by_vector(VECTOR(1536), FLOAT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_products_by_vector(VECTOR(1536), FLOAT, INTEGER) TO authenticated;

-- Test funkce s náhodným vektorem
DO $$
DECLARE
    test_vector VECTOR(1536);
    result_count INTEGER;
BEGIN
    -- Vytvoříme testovací vektor (náhodné hodnoty)
    test_vector := (
        SELECT array_agg(random()::float - 0.5)::vector 
        FROM generate_series(1, 1536)
    );
    
    -- Otestujeme funkci
    SELECT COUNT(*) INTO result_count
    FROM public.search_products_by_vector(test_vector, 0.1, 5);
    
    RAISE NOTICE 'Test funkce search_products_by_vector: nalezeno % výsledků', result_count;
END $$;

-- Ověříme, že funkce existuje
SELECT 
    proname as function_name,
    pronargs as num_args,
    proargtypes as arg_types
FROM pg_proc 
WHERE proname = 'search_products_by_vector' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Zobrazíme počet záznamů v product_embeddings
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
    COUNT(CASE WHEN embedding_status = 'completed' THEN 1 END) as completed
FROM public.product_embeddings;
