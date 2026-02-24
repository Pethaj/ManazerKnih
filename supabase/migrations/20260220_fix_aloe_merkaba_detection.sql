-- Oprava detekce Aloe/Merkaba + oprava struktury tabulky leceni
-- Změna: Kontrolujeme na NOT NULL a ne prázdný string místo konkrétních hodnot
-- Oprava: Tabulka leceni NEMÁ sloupce "nazev" ani "aktivni"

CREATE OR REPLACE FUNCTION match_product_combinations_with_problems(problems TEXT[])
RETURNS TABLE (
  matched_product_code TEXT,
  category TEXT,
  product_name TEXT,
  url TEXT,
  thumbnail TEXT,
  aloe_recommended TEXT,
  aloe_product TEXT,
  merkaba_recommended TEXT,
  combination_name TEXT,
  matched_problem TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rules AS (
    -- Najdi všechna pravidla která matchují problém
    SELECT 
      l."Problém" as problem,
      l."Prawtein" as prawtein,
      l."TČM wan" as tcm_wan,
      l."Aloe" as aloe,
      l."Merkaba" as merkaba
    FROM leceni l
    WHERE (
        -- Filtr POUZE podle problému (case-insensitive match)
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
    -- Pro každé pravidlo vyber Prawtein a TČM produkty
    SELECT 
      mr.problem as combination_name,
      mr.problem,
      mr.prawtein as product_code,
      'Prawtein' as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.prawtein IS NOT NULL AND TRIM(mr.prawtein) != ''
    
    UNION ALL
    
    SELECT 
      mr.problem as combination_name,
      mr.problem,
      mr.tcm_wan as product_code,
      'TČM - Tradiční čínská medicína' as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.tcm_wan IS NOT NULL AND TRIM(mr.tcm_wan) != ''
  )
  -- Obohatit o data z product_feed_2
  SELECT DISTINCT
    COALESCE(pf.product_code::TEXT, mp.product_code::TEXT) as matched_product_code,
    COALESCE(pf.category, mp.category)::TEXT as category,
    COALESCE(pf.product_name::TEXT, mp.product_code::TEXT) as product_name,
    pf.url::TEXT,
    pf.thumbnail::TEXT,
    CASE 
      -- Pokud je buňka vyplněná (NOT NULL a ne prázdný string), je to TRUE
      WHEN mp.aloe IS NOT NULL AND TRIM(mp.aloe) != '' THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as aloe_recommended,
    -- Konkrétní název/kód Aloe produktu z tabulky leceni (např. "Aloe Vera Immunity")
    NULLIF(TRIM(mp.aloe), '')::TEXT as aloe_product,
    CASE 
      -- Pokud je buňka vyplněná (NOT NULL a ne prázdný string), je to TRUE
      WHEN mp.merkaba IS NOT NULL AND TRIM(mp.merkaba) != '' THEN 'ano'::TEXT
      ELSE 'ne'::TEXT
    END as merkaba_recommended,
    mp.combination_name::TEXT,
    mp.problem::TEXT as matched_problem
  FROM matched_products mp
  LEFT JOIN product_feed_2 pf ON (
    -- Pokusíme se matchovat 3 způsoby:
    -- 1. Exact match (např. "008 - Skořicová směs")
    LOWER(TRIM(pf.product_name)) = LOWER(TRIM(mp.product_code))
    OR
    -- 2. Match s prefixem "PRAWTEIN " (např. "Frankincense Plus" → "PRAWTEIN Frankincense Plus")
    LOWER(TRIM(pf.product_name)) = LOWER(TRIM('PRAWTEIN ' || mp.product_code))
    OR
    -- 3. Match bez prefixu (produkt v DB bez PRAWTEIN)
    LOWER(TRIM(pf.product_name)) LIKE LOWER(TRIM('%' || mp.product_code || '%'))
  );
END;
$$ LANGUAGE plpgsql;
