-- ============================================================================
-- MIGRACE: Párování kombinací produktů (tabulka leceni)
-- Datum: 2026-02-18
-- Popis: Vytvoření tabulky leceni pro automatické párování produktů BEWIT
--        a SQL funkce pro matching kombinací
-- ============================================================================

-- 1. Vytvoření tabulky leceni
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leceni (
  id BIGSERIAL PRIMARY KEY,
  nazev VARCHAR(255) NOT NULL,  -- Název kombinace (např. "Podpora trávení")
  
  -- Vstupní produkty (triggery) - esenciální oleje
  eo_1 VARCHAR(100),   -- Product code pro EO 1
  eo_2 VARCHAR(100),   -- Product code pro EO 2
  eo_3 VARCHAR(100),   -- Product code pro EO 3
  
  -- Výstupní doporučení - doplňkové produkty
  prawtein VARCHAR(100),        -- Product code Prawteinu
  tcm_wan VARCHAR(100),          -- Product code TČM wan
  
  -- Dodatečná doporučení
  aloe BOOLEAN DEFAULT false,    -- Doporučit Aloe?
  merkaba BOOLEAN DEFAULT false, -- Doporučit Merkaba?
  
  -- Metadata
  poznamka TEXT,                 -- Volitelná poznámka
  aktivni BOOLEAN DEFAULT true,  -- Je pravidlo aktivní?
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_leceni_eo_1 ON leceni(eo_1) WHERE eo_1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leceni_eo_2 ON leceni(eo_2) WHERE eo_2 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leceni_eo_3 ON leceni(eo_3) WHERE eo_3 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leceni_aktivni ON leceni(aktivni) WHERE aktivni = true;

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_leceni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leceni_updated_at
  BEFORE UPDATE ON leceni
  FOR EACH ROW
  EXECUTE FUNCTION update_leceni_updated_at();

-- ============================================================================
-- 2. SQL Funkce pro matching produktových kombinací
-- ============================================================================

CREATE OR REPLACE FUNCTION match_product_combinations(
  input_codes TEXT[]  -- Pole vstupních product_code
)
RETURNS TABLE (
  matched_product_code TEXT,
  matched_category TEXT,
  matched_product_name TEXT,
  matched_product_url TEXT,
  matched_thumbnail TEXT,
  aloe_recommended BOOLEAN,
  merkaba_recommended BOOLEAN,
  combination_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH matched_rules AS (
    -- Najdi všechna pravidla, kde alespoň jeden vstupní kód odpovídá
    SELECT DISTINCT
      l.id,
      l.nazev,
      l.prawtein,
      l.tcm_wan,
      l.aloe,
      l.merkaba
    FROM leceni l
    WHERE 
      l.aktivni = true
      AND (
        l.eo_1 = ANY(input_codes) OR
        l.eo_2 = ANY(input_codes) OR
        l.eo_3 = ANY(input_codes)
      )
  ),
  matched_products AS (
    -- Pro každé pravidlo vyber Prawtein a TČM produkty
    SELECT 
      mr.nazev as combination_name,
      mr.prawtein as product_code,
      'Prawtein' as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.prawtein IS NOT NULL
    
    UNION ALL
    
    SELECT 
      mr.nazev as combination_name,
      mr.tcm_wan as product_code,
      'TČM - Tradiční čínská medicína' as category,
      mr.aloe,
      mr.merkaba
    FROM matched_rules mr
    WHERE mr.tcm_wan IS NOT NULL
  )
  -- Obohatit o data z product_feed_2
  SELECT DISTINCT
    mp.product_code,
    mp.category,
    COALESCE(pf.product_name, mp.product_code) as product_name,
    pf.url,
    pf.thumbnail,
    mp.aloe,
    mp.merkaba,
    mp.combination_name
  FROM matched_products mp
  LEFT JOIN product_feed_2 pf ON pf.product_code = mp.product_code
  WHERE 
    -- Vyfiltruj produkty, které už jsou ve vstupním seznamu
    mp.product_code != ALL(input_codes);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Příkladová data (ID 1 podle zadání)
-- ============================================================================

-- Příklad: Pokud je vybrán NOHEPA EO, Best friend nebo NOPA,
-- doporuč Prawtein Frankincense Plus a TČM 004 - Eliminace větru
INSERT INTO leceni (
  nazev, 
  eo_1, eo_2, eo_3, 
  prawtein, tcm_wan, 
  aloe, merkaba,
  poznamka
) VALUES (
  'Podpora trávení a eliminace větru',
  'NOHEPA',           -- NOHEPA EO
  'BESTFRIEND',       -- Best friend
  'NOPA',             -- NOPA
  'FRANKINCENSE_PLUS', -- Prawtein Frankincense Plus
  '004',              -- 004 - Eliminace větru
  true,               -- Aloe doporučeno
  false,              -- Merkaba ne
  'Kombinace pro podporu trávení'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. RLS Policies pro tabulku leceni
-- ============================================================================

-- Povolit čtení pro authenticated users
ALTER TABLE leceni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
ON leceni FOR SELECT TO authenticated
USING (true);

-- Povolit čtení pro anonymous users (pro chatbot)
CREATE POLICY "Allow read access to anonymous users"
ON leceni FOR SELECT TO anon
USING (true);

-- Zápis pouze pro service role (admin)
CREATE POLICY "Allow all for service role"
ON leceni FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Permissions
GRANT SELECT ON leceni TO anon;
GRANT SELECT ON leceni TO authenticated;
GRANT ALL ON leceni TO service_role;
GRANT USAGE, SELECT ON SEQUENCE leceni_id_seq TO service_role;

-- ============================================================================
-- 5. Přidání enable_product_pairing do chatbot_settings
-- ============================================================================

-- Přidat nový sloupec do chatbot_settings (pokud tabulka existuje)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chatbot_settings'
  ) THEN
    -- Přidat sloupec enable_product_pairing pokud neexistuje
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'chatbot_settings' 
      AND column_name = 'enable_product_pairing'
    ) THEN
      ALTER TABLE chatbot_settings 
      ADD COLUMN enable_product_pairing BOOLEAN DEFAULT false;
      
      RAISE NOTICE 'Sloupec enable_product_pairing přidán do chatbot_settings';
    END IF;
  ELSE
    RAISE NOTICE 'Tabulka chatbot_settings neexistuje - přeskakuji';
  END IF;
END $$;

-- ============================================================================
-- 6. Test funkce (volitelné - můžeš zakomentovat po ověření)
-- ============================================================================

-- Test: Pokud máme NOHEPA ve vstupních produktech
-- SELECT * FROM match_product_combinations(ARRAY['NOHEPA']::TEXT[]);

-- Očekávaný výsledek:
-- matched_product_code | matched_category | matched_product_name | aloe_recommended | merkaba_recommended
-- FRANKINCENSE_PLUS    | Prawtein         | (název z DB)         | true             | false
-- 004                  | TČM              | 004 - Eliminace větru| true             | false

COMMENT ON TABLE leceni IS 'Tabulka pro automatické párování produktových kombinací v chatbotu';
COMMENT ON FUNCTION match_product_combinations IS 'Funkce pro nalezení doporučených produktů na základě vstupních kódů';
