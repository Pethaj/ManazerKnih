-- ================================================================
-- TABULKA PRO PRODUCT FEED ABC (BEWIT Custom Feed)
-- ================================================================
-- Struktura XML feedu:
-- <ITEM>
--   <PRODUCTNAME>, <DESCRIPTION_SHORT>, <DESCRIPTION_LONG>
--   <CATEGORYTEXT id="...">
--   <URL>, <THUMBNAIL>, <SALES_LAST_30_DAYS>
--   <VARIANTS>
--     <VARIANT>
--       <PRICE_A>, <PRICE_B percents="15">, <PRICE_C percents="30">
--       <IN_ACTION>, <AVAIBILITY>, <ACCESSIBILITY><ITEM>public/birthday/...</ITEM>
--       <ADD_TO_CART_ID>  (formát: "productId_variantId")
--     </VARIANT>
--   </VARIANTS>
-- </ITEM>
-- Pozn.: produkt nemá vlastní <ID>, identifikátor se odvozuje z URL nebo ADD_TO_CART_ID

CREATE TABLE IF NOT EXISTS public.product_feed_abc (
  id                      BIGSERIAL PRIMARY KEY,
  product_code            VARCHAR(100) UNIQUE NOT NULL,   -- odvozeno z URL (slug) nebo prvního ADD_TO_CART_ID prefix
  product_name            VARCHAR(500) NOT NULL,           -- PRODUCTNAME
  description_short       TEXT,                            -- DESCRIPTION_SHORT
  description_long        TEXT,                            -- DESCRIPTION_LONG
  category                VARCHAR(255),                    -- CATEGORYTEXT
  category_id             INTEGER,                         -- atribut id na CATEGORYTEXT
  url                     TEXT,                            -- URL produktu
  thumbnail               TEXT,                            -- URL obrázku
  sales_last_30_days      INTEGER DEFAULT 0,               -- SALES_LAST_30_DAYS
  -- Ceny z první veřejné varianty
  price_a                 DECIMAL(10, 2),                  -- PRICE_A (základní cena)
  price_b                 DECIMAL(10, 2),                  -- PRICE_B (sleva ~15 %)
  price_b_percents        INTEGER,                         -- procenta slevy B
  price_c                 DECIMAL(10, 2),                  -- PRICE_C (sleva ~30 %)
  price_c_percents        INTEGER,                         -- procenta slevy C
  in_action               INTEGER DEFAULT 0,               -- je varianta v akci
  availability            INTEGER DEFAULT 0,               -- AVAIBILITY první varianty
  accessibility           TEXT[],                          -- pole přístupností (public, birthday, ...)
  add_to_cart_id          VARCHAR(100),                    -- ADD_TO_CART_ID první varianty
  -- JSON s kompletními variantami pro pozdější použití
  variants_json           JSONB,
  currency                VARCHAR(10) DEFAULT 'CZK',
  sync_status             VARCHAR(50) DEFAULT 'pending',
  last_sync_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  -- Embedding podpora (stejný vzor jako product_feed_2)
  embedding_status        VARCHAR(50) DEFAULT 'none',      -- none/pending/processing/completed/error
  embedding_generated_at  TIMESTAMPTZ
);

-- Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_product_feed_abc_code       ON public.product_feed_abc(product_code);
CREATE INDEX IF NOT EXISTS idx_product_feed_abc_category   ON public.product_feed_abc(category);
CREATE INDEX IF NOT EXISTS idx_product_feed_abc_sync_status ON public.product_feed_abc(sync_status);
CREATE INDEX IF NOT EXISTS idx_product_feed_abc_sales      ON public.product_feed_abc(sales_last_30_days DESC);
CREATE INDEX IF NOT EXISTS idx_product_feed_abc_embedding  ON public.product_feed_abc(embedding_status);

-- Trigger pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_product_feed_abc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_feed_abc_updated_at ON public.product_feed_abc;
CREATE TRIGGER product_feed_abc_updated_at
  BEFORE UPDATE ON public.product_feed_abc
  FOR EACH ROW
  EXECUTE FUNCTION update_product_feed_abc_updated_at();

-- ================================================================
-- UPSERT FUNKCE (zachová embedding při re-syncu)
-- ================================================================
CREATE OR REPLACE FUNCTION upsert_product_feed_abc_preserve_embedding(
  p_product_code        VARCHAR(100),
  p_product_name        VARCHAR(500),
  p_description_short   TEXT,
  p_description_long    TEXT,
  p_category            VARCHAR(255),
  p_category_id         INTEGER,
  p_url                 TEXT,
  p_thumbnail           TEXT,
  p_sales_last_30_days  INTEGER,
  p_price_a             DECIMAL(10,2),
  p_price_b             DECIMAL(10,2),
  p_price_b_percents    INTEGER,
  p_price_c             DECIMAL(10,2),
  p_price_c_percents    INTEGER,
  p_in_action           INTEGER,
  p_availability        INTEGER,
  p_accessibility       TEXT[],
  p_add_to_cart_id      VARCHAR(100),
  p_variants_json       JSONB,
  p_currency            VARCHAR(10),
  p_sync_status         VARCHAR(50),
  p_last_sync_at        TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.product_feed_abc (
    product_code, product_name, description_short, description_long,
    category, category_id, url, thumbnail, sales_last_30_days,
    price_a, price_b, price_b_percents, price_c, price_c_percents,
    in_action, availability, accessibility, add_to_cart_id, variants_json,
    currency, sync_status, last_sync_at, embedding_status
  ) VALUES (
    p_product_code, p_product_name, p_description_short, p_description_long,
    p_category, p_category_id, p_url, p_thumbnail, p_sales_last_30_days,
    p_price_a, p_price_b, p_price_b_percents, p_price_c, p_price_c_percents,
    p_in_action, p_availability, p_accessibility, p_add_to_cart_id, p_variants_json,
    p_currency, p_sync_status, p_last_sync_at, 'none'
  )
  ON CONFLICT (product_code) DO UPDATE SET
    product_name          = EXCLUDED.product_name,
    description_short     = EXCLUDED.description_short,
    description_long      = EXCLUDED.description_long,
    category              = EXCLUDED.category,
    category_id           = EXCLUDED.category_id,
    url                   = EXCLUDED.url,
    thumbnail             = EXCLUDED.thumbnail,
    sales_last_30_days    = EXCLUDED.sales_last_30_days,
    price_a               = EXCLUDED.price_a,
    price_b               = EXCLUDED.price_b,
    price_b_percents      = EXCLUDED.price_b_percents,
    price_c               = EXCLUDED.price_c,
    price_c_percents      = EXCLUDED.price_c_percents,
    in_action             = EXCLUDED.in_action,
    availability          = EXCLUDED.availability,
    accessibility         = EXCLUDED.accessibility,
    add_to_cart_id        = EXCLUDED.add_to_cart_id,
    variants_json         = EXCLUDED.variants_json,
    currency              = EXCLUDED.currency,
    sync_status           = EXCLUDED.sync_status,
    last_sync_at          = EXCLUDED.last_sync_at,
    updated_at            = NOW(),
    -- Zachováme embedding_status a embedding_generated_at při re-syncu
    embedding_status      = COALESCE(public.product_feed_abc.embedding_status, 'none'),
    embedding_generated_at = public.product_feed_abc.embedding_generated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- RLS POLICIES
-- ================================================================
ALTER TABLE public.product_feed_abc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users - abc"
ON public.product_feed_abc FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to anonymous users - abc"
ON public.product_feed_abc FOR SELECT TO anon USING (true);

CREATE POLICY "Allow all for service role - abc"
ON public.product_feed_abc FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT SELECT ON public.product_feed_abc TO anon;
GRANT SELECT ON public.product_feed_abc TO authenticated;
GRANT ALL ON public.product_feed_abc TO service_role;
GRANT USAGE, SELECT ON SEQUENCE product_feed_abc_id_seq TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Tabulka product_feed_abc úspěšně vytvořena!';
END $$;
