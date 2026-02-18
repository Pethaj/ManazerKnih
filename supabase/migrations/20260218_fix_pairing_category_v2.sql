-- ============================================================================
-- FIX: Oprava kategorie v match_product_combinations_with_problems
-- Datum: 2026-02-18 13:30
-- Problém: Napárované produkty měly category = undefined
-- Řešení: Změnit mp.category na COALESCE(pf.category, mp.category)
-- ============================================================================

CREATE OR REPLACE FUNCTION match_product_combinations_with_problems(
  problems TEXT[]
)
RETURNS TABLE (
  matched_product_code TEXT,
  matched_category TEXT,
  matched_product_name TEXT,
  matched_product_url TEXT,
  matched_thumbnail TEXT,
  aloe_recommended TEXT,
  merkaba_recommended TEXT,
  combination_name TEXT,
  matched_problem TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rules AS (
    SELECT DISTINCT
      l."ID",
      l."Problém"::TEXT as problem,
      l."Prawtein"::TEXT as prawtein,
      l."TČM wan"::TEXT as tcm_wan,
      l."Aloe"::TEXT as aloe,
      l."Merkaba"::TEXT as merkaba,
      l."Poznámka"::TEXT as poznamka
    FROM leceni l
    WHERE
      (
        problems IS NULL
        OR array_length(problems, 1) IS NULL
        OR EXISTS (
          SELECT 1
          FROM unnest(problems) AS p
          WHERE UPPER(l."Problém"::TEXT) = UPPER(p)
        )
      )
  ),
  matched_products AS (
    SELECT 
      mr.poznamka as combination_name,
      mr.problem,
      mr.prawtein as product_code,
      'PRAWTEIN® – superpotravinové směsi'::TEXT as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.prawtein IS NOT NULL AND mr.prawtein != ''
    
    UNION ALL
    
    SELECT 
      mr.poznamka as combination_name,
      mr.problem,
      mr.tcm_wan as product_code,
      'TČM - Tradiční čínská medicína'::TEXT as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.tcm_wan IS NOT NULL AND mr.tcm_wan != ''
  )
  -- 🔧 FIX: Použij pf.category z product_feed_2 místo hardcodované mp.category
  SELECT DISTINCT
    mp.product_code::TEXT,
    COALESCE(pf.category, mp.category)::TEXT as category,  -- ⬅️ OPRAVA TADY!
    COALESCE(pf.product_name::TEXT, mp.product_code::TEXT) as product_name,
    pf.url::TEXT,
    pf.thumbnail::TEXT,
    CASE
      WHEN mp.aloe IS NOT NULL AND LOWER(TRIM(mp.aloe)) IN ('ano', 'yes', '1') THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as aloe_recommended,
    CASE
      WHEN mp.merkaba IS NOT NULL AND LOWER(TRIM(mp.merkaba)) IN ('ano', 'yes', '1') THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as merkaba_recommended,
    mp.combination_name::TEXT,
    mp.problem::TEXT as matched_problem
  FROM matched_products mp
  LEFT JOIN product_feed_2 pf ON pf.product_code = mp.product_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TEST
-- ============================================================================

-- Test funkce:
SELECT * FROM match_product_combinations_with_problems(
  ARRAY['Bolest hlavy – ze stresu']::TEXT[]
);

-- Očekávaný výsledek:
-- - Reishi má category = "PRAWTEIN® – superpotravinové směsi"
-- - 063 - Klidné dřevo má category = "TČM - Tradiční čínská medicína"
