-- ============================================================================
-- OPRAVA: Přidání is_companion pole do match_product_combinations_with_problems
-- ============================================================================
-- 
-- PROBLÉM:
-- Funkce match_product_combinations_with_problems nevrací pole is_companion,
-- které je potřebné pro rozdělení companion produktů (TČM) od hlavních (Prawtein).
-- 
-- ŘEŠENÍ:
-- Přidat is_companion Boolean pole do RETURN TABLE:
-- - is_companion = FALSE pro Prawtein produkty (hlavní doporučení)
-- - is_companion = TRUE pro TČM produkty (doprovodné produkty)
-- 
-- DOPAD:
-- - Frontend nyní zobrazí "Další doprovodné produkty" dropdown
-- - Dropdown obsahuje TČM produkty, které jsou companion=true
-- ============================================================================

-- Smazat starou verzi funkce
DROP FUNCTION IF EXISTS match_product_combinations_with_problems(TEXT[]) CASCADE;

-- Vytvořit novou verzi s is_companion polem
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
  matched_problem TEXT,
  is_companion BOOLEAN,
  aloe_product TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rules AS (
    SELECT DISTINCT
      l."ID",
      l."Problém" as problem,
      l."Prawtein",
      l."TČM wan",
      l."Aloe",
      l."Merkaba"
    FROM leceni l
    WHERE 
      (
        problems IS NULL 
        OR array_length(problems, 1) IS NULL
        OR EXISTS (
          SELECT 1 
          FROM unnest(problems) AS p
          WHERE UPPER(l."Problém") = UPPER(p)
        )
      )
  ),
  matched_products AS (
    -- Prawtein produkty (is_companion = false - hlavní produkty)
    SELECT 
      mr.problem as combination_name,
      mr.problem,
      mr."Prawtein" as product_code,
      'Prawtein' as category,
      mr."Aloe",
      mr."Merkaba",
      mr."Aloe" as aloe_column,
      false::BOOLEAN as is_companion
    FROM matched_rules mr
    WHERE mr."Prawtein" IS NOT NULL AND TRIM(mr."Prawtein") != ''
    
    UNION ALL
    
    -- TČM produkty (is_companion = true - doprovodné produkty)
    SELECT 
      mr.problem as combination_name,
      mr.problem,
      mr."TČM wan" as product_code,
      'TČM - Tradiční čínská medicína' as category,
      mr."Aloe",
      mr."Merkaba",
      mr."Aloe" as aloe_column,
      true::BOOLEAN as is_companion
    FROM matched_rules mr
    WHERE mr."TČM wan" IS NOT NULL AND TRIM(mr."TČM wan") != ''
  )
  SELECT DISTINCT
    COALESCE(pf.product_code::TEXT, mp.product_code::TEXT) as matched_product_code,
    COALESCE(pf.category, mp.category)::TEXT as category,
    COALESCE(pf.product_name::TEXT, mp.product_code::TEXT) as product_name,
    pf.url::TEXT,
    pf.thumbnail::TEXT,
    CASE 
      WHEN mp."Aloe" IS NOT NULL AND LOWER(TRIM(COALESCE(mp."Aloe"::TEXT, ''))) IN ('ano', 'yes', '1', 'true', 'aloe', 'aloe immunity', 'aloe vera') THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as aloe_recommended,
    CASE 
      WHEN mp."Merkaba" IS NOT NULL AND LOWER(TRIM(COALESCE(mp."Merkaba"::TEXT, ''))) IN ('ano', 'yes', '1', 'true') THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as merkaba_recommended,
    mp.combination_name::TEXT,
    mp.problem::TEXT as matched_problem,
    mp.is_companion::BOOLEAN,
    mp.aloe_column::TEXT as aloe_product
  FROM matched_products mp
  LEFT JOIN product_feed_2 pf ON (
    LOWER(TRIM(pf.product_name)) = LOWER(TRIM(mp.product_code))
    OR
    LOWER(TRIM(pf.product_name)) = LOWER(TRIM('PRAWTEIN ' || mp.product_code))
    OR
    LOWER(TRIM(pf.product_name)) LIKE LOWER(TRIM('%' || REPLACE(mp.product_code, ' ', '') || '%'))
    OR
    LOWER(TRIM(pf.product_code)) = LOWER(TRIM(mp.product_code))
  );
END;
$$ LANGUAGE plpgsql;

-- Nastavit oprávnění
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems(TEXT[]) TO anon;
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems(TEXT[]) TO service_role;

COMMENT ON FUNCTION match_product_combinations_with_problems IS 
'Párování produktů POUZE podle problému. Vrací VŠECHNY Prawtein, TČM wan, Aloe a Merkaba pro daný problém.
is_companion: FALSE pro Prawtein (hlavní), TRUE pro TČM (doprovodné).';
