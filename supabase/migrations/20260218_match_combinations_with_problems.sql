-- ============================================================================
-- SQL FUNKCE: Párování produktů podle problému + EO
-- ============================================================================
-- 
-- Tato funkce rozšiřuje match_product_combinations o filtrování podle problému
-- Používá se pro Product Pairing s Problem Classification
-- 
-- Vstup:
--   - problems: pole problémů (např. ["Bolest hlavy – ze stresu"])
--   - input_codes: pole product_code EO (např. ["NOHEPA", "BESTFRIEND"])
-- 
-- Výstup: Napárované produkty (Prawtein, TČM, Aloe, Merkaba)
-- ============================================================================

CREATE OR REPLACE FUNCTION match_product_combinations_with_problems(
  problems TEXT[]            -- Pole problémů z Problem Classification
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
  matched_problem TEXT       -- Přidáno: Problém, pro který byla kombinace nalezena
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rules AS (
    -- Najdi všechna pravidla, kde problém odpovídá jednomu z problems[] (case-insensitive)
    -- NEFILTRUJEME podle product_code - vracíme VŠECHNY kombinace pro daný problém
    SELECT DISTINCT
      l.id,
      l.nazev,
      l."Problém" as problem,
      l.prawtein,
      l.tcm_wan,
      l.aloe,
      l.merkaba
    FROM leceni l
    WHERE 
      l.aktivni = true
      AND (
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
      mr.nazev as combination_name,
      mr.problem,
      mr.prawtein as product_code,
      'Prawtein' as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.prawtein IS NOT NULL AND mr.prawtein != ''
    
    UNION ALL
    
    SELECT 
      mr.nazev as combination_name,
      mr.problem,
      mr.tcm_wan as product_code,
      'TČM - Tradiční čínská medicína' as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.tcm_wan IS NOT NULL AND mr.tcm_wan != ''
  )
  -- Obohatit o data z product_feed_2
  -- 🔧 FIX: Matching podle NÁZVU produktu s ignorováním prefixu "PRAWTEIN"
  --         Protože v tabulce leceni jsou NÁZVY bez prefixu (např. "Frankincense Plus")
  --         ale v product_feed_2 jsou s prefixem (např. "PRAWTEIN Frankincense Plus")
  SELECT DISTINCT
    COALESCE(pf.product_code::TEXT, mp.product_code::TEXT) as matched_product_code,
    COALESCE(pf.category, mp.category)::TEXT as category,
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
  -- NEFILTRUJEME duplicity s input_codes - chceme VŠECHNY produkty pro problém
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- KOMENTÁŘE
-- ============================================================================

COMMENT ON FUNCTION match_product_combinations_with_problems IS 
'Párování produktů POUZE podle problému (bez filtrování podle EO). 
Vrací VŠECHNY Prawtein, TČM wan, Aloe a Merkaba pro daný problém.
Produkty se pak spojí s extrahovanými produkty z N8N odpovědi a odstraní se duplicity.';

-- ============================================================================
-- PŘÍKLAD POUŽITÍ
-- ============================================================================

-- Test 1: Načti všechny kombinace pro problém
-- SELECT * FROM match_product_combinations_with_problems(
--   ARRAY['Bolest hlavy – ze stresu']::TEXT[]
-- );
-- Vrátí: Všechny Prawtein, TČM produkty pro "Bolest hlavy – ze stresu"

-- Test 2: Více problémů najednou
-- SELECT * FROM match_product_combinations_with_problems(
--   ARRAY['Bolest hlavy – ze stresu', 'Migréna']::TEXT[]
-- );
-- Vrátí: Produkty pro OBA problémy

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Povolit čtení pro authenticated users
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems TO authenticated;

-- Povolit čtení pro anonymous users (pro chatbot)
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems TO anon;

-- Plný přístup pro service role
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems TO service_role;
