-- ================================================================
-- TABULKA PRO PRODUCT FEED 2 (Nový BEWIT Feed)
-- ================================================================

-- Vytvoření hlavní tabulky pro Product Feed 2
CREATE TABLE IF NOT EXISTS public.product_feed_2 (
  id BIGSERIAL PRIMARY KEY,
  product_code VARCHAR(100) UNIQUE NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  description_short TEXT,
  description_long TEXT,
  category VARCHAR(255),
  url TEXT,
  thumbnail TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'CZK',
  availability INTEGER DEFAULT 0,
  in_action INTEGER DEFAULT 0,
  sales_last_30_days INTEGER DEFAULT 0,
  sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_product_feed_2_code ON public.product_feed_2(product_code);
CREATE INDEX IF NOT EXISTS idx_product_feed_2_category ON public.product_feed_2(category);
CREATE INDEX IF NOT EXISTS idx_product_feed_2_sync_status ON public.product_feed_2(sync_status);
CREATE INDEX IF NOT EXISTS idx_product_feed_2_sales ON public.product_feed_2(sales_last_30_days DESC);

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_product_feed_2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_feed_2_updated_at
  BEFORE UPDATE ON public.product_feed_2
  FOR EACH ROW
  EXECUTE FUNCTION update_product_feed_2_updated_at();

-- ================================================================
-- ROZŠÍŘENÍ TABULKY PRODUCT_EMBEDDINGS
-- ================================================================

-- Přidáme sloupce pro Feed 2 support
ALTER TABLE public.product_embeddings 
ADD COLUMN IF NOT EXISTS feed_source VARCHAR(50) DEFAULT 'feed_1';

ALTER TABLE public.product_embeddings 
ADD COLUMN IF NOT EXISTS description_short TEXT;

ALTER TABLE public.product_embeddings 
ADD COLUMN IF NOT EXISTS description_long TEXT;

-- Index pro rychlé filtrování podle zdroje
CREATE INDEX IF NOT EXISTS idx_product_embeddings_feed_source 
ON public.product_embeddings(feed_source);

-- Aktualizujeme search_text generování pro Feed 2
-- (obsahuje short i long description)
CREATE OR REPLACE FUNCTION generate_product_search_text()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.feed_source = 'feed_2' THEN
    -- Pro Feed 2 kombinujeme short a long description
    NEW.search_text := CONCAT_WS(' ',
      NEW.product_name,
      NEW.description_short,
      NEW.description_long,
      NEW.category
    );
  ELSE
    -- Pro Feed 1 používáme standardní description
    NEW.search_text := CONCAT_WS(' ',
      NEW.product_name,
      NEW.description,
      NEW.category
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_embeddings_search_text
  BEFORE INSERT OR UPDATE ON public.product_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_search_text();

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Povolíme RLS na nové tabulce
ALTER TABLE public.product_feed_2 ENABLE ROW LEVEL SECURITY;

-- Policy pro čtení - všichni authenticated users
CREATE POLICY "Allow read access to all authenticated users"
ON public.product_feed_2
FOR SELECT
TO authenticated
USING (true);

-- Policy pro čtení - anonymní uživatelé (pro public API)
CREATE POLICY "Allow read access to anonymous users"
ON public.product_feed_2
FOR SELECT
TO anon
USING (true);

-- Policy pro INSERT/UPDATE - pouze service role
CREATE POLICY "Allow insert/update for service role"
ON public.product_feed_2
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT SELECT ON public.product_feed_2 TO anon;
GRANT SELECT ON public.product_feed_2 TO authenticated;
GRANT ALL ON public.product_feed_2 TO service_role;
GRANT USAGE, SELECT ON SEQUENCE product_feed_2_id_seq TO service_role;

-- ================================================================
-- AKTUALIZACE SYNC_LOGS PRO FEED 2
-- ================================================================

-- Přidáme nový typ sync_type pro feed 2 (pokud používáme ENUM)
-- Pokud sync_type je VARCHAR, tento krok můžeme přeskočit

-- Ověření struktury
DO $$ 
BEGIN
  -- Kontrola jestli sync_logs existuje
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'sync_logs') THEN
    RAISE NOTICE 'Tabulka sync_logs již existuje - OK';
  ELSE
    RAISE NOTICE 'Tabulka sync_logs neexistuje - možná ji bude třeba vytvořit';
  END IF;
END $$;

-- ================================================================
-- UKÁZKA TESTOVACÍCH DAT (OPTIONAL)
-- ================================================================

/*
-- Test insert
INSERT INTO public.product_feed_2 (
  product_code,
  product_name,
  description_short,
  description_long,
  category,
  url,
  thumbnail,
  price,
  availability,
  in_action,
  sales_last_30_days,
  sync_status,
  last_sync_at
) VALUES (
  '2347',
  '009 - Čistý dech',
  '**009 – Te Xiao Bi Min Gan Wan** Protáhněte **nosní dírky**...',
  '&nbsp; ### Tradičně byla tato směs oblíbená...',
  'TČM - Tradiční čínská medicína',
  'https://bewit.love/produkt/bewit-cisty-dech',
  'https://bewit.love/images/products/1730184660-tcm-009-clear-breath-komp.png',
  175.00,
  1,
  0,
  6,
  'success',
  NOW()
);
*/

-- ================================================================
-- STATISTIKY
-- ================================================================

-- Zobrazíme počet záznamů
DO $$ 
BEGIN
  RAISE NOTICE 'SQL schéma pro Product Feed 2 bylo úspěšně vytvořeno!';
  RAISE NOTICE 'Tabulka: product_feed_2';
  RAISE NOTICE 'Rozšíření: product_embeddings (feed_source, description_short, description_long)';
END $$;


