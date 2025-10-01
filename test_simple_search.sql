-- ================================================================
-- JEDNODUCHÉ TESTOVÁNÍ PRODUKTOVÉHO VYHLEDÁVÁNÍ BEZ VEKTORŮ
-- ================================================================

-- Zobrazíme obsah product_embeddings tabulky
SELECT 
    product_code,
    product_name,
    category,
    embedding_status,
    CASE 
        WHEN embedding IS NULL THEN 'NULL'
        ELSE 'FILLED'
    END as embedding_status_check
FROM public.product_embeddings 
LIMIT 10;

-- Zobrazíme statistiky
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
    COUNT(CASE WHEN embedding_status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN embedding_status = 'pending' THEN 1 END) as pending
FROM public.product_embeddings;

-- Zkusíme vytvořit jednoduchou funkci pro fulltext vyhledávání
CREATE OR REPLACE FUNCTION public.search_products_simple(
  search_query TEXT,
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
  match_score FLOAT
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
    0.5::FLOAT as match_score -- Pevné skóre pro testování
  FROM public.product_embeddings pe
  WHERE 
    pe.product_name ILIKE '%' || search_query || '%'
    OR pe.description ILIKE '%' || search_query || '%'
    OR pe.category ILIKE '%' || search_query || '%'
  ORDER BY pe.product_name
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Nastavíme oprávnění
GRANT EXECUTE ON FUNCTION public.search_products_simple(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.search_products_simple(TEXT, INTEGER) TO authenticated;

-- Test jednoduché funkce
SELECT * FROM public.search_products_simple('aromaterapie', 5);
