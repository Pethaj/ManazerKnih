-- ================================================================
-- FUNKCE PRO UPSERT PRODUKTŮ SE ZACHOVÁNÍM EMBEDDING STATUSU
-- ================================================================

-- Tato funkce zajistí, že při synchronizaci feedu se NEPŘEPÍŠE
-- embedding_status a embedding_generated_at u existujících produktů

CREATE OR REPLACE FUNCTION upsert_product_feed_2_preserve_embedding(
  p_product_code VARCHAR,
  p_product_name VARCHAR,
  p_description_short TEXT,
  p_description_long TEXT,
  p_category VARCHAR,
  p_url TEXT,
  p_thumbnail TEXT,
  p_price NUMERIC,
  p_currency VARCHAR,
  p_availability INTEGER,
  p_in_action INTEGER,
  p_sales_last_30_days INTEGER,
  p_sync_status VARCHAR,
  p_last_sync_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT nebo UPDATE
  -- Pokud product_code existuje, aktualizuj pouze data z feedu
  -- ALE ZACHOVEJ embedding_status a embedding_generated_at!
  
  INSERT INTO product_feed_2 (
    product_code,
    product_name,
    description_short,
    description_long,
    category,
    url,
    thumbnail,
    price,
    currency,
    availability,
    in_action,
    sales_last_30_days,
    sync_status,
    last_sync_at,
    embedding_status,
    embedding_generated_at
  ) VALUES (
    p_product_code,
    p_product_name,
    p_description_short,
    p_description_long,
    p_category,
    p_url,
    p_thumbnail,
    p_price,
    p_currency,
    p_availability,
    p_in_action,
    p_sales_last_30_days,
    p_sync_status,
    p_last_sync_at,
    'none',  -- Default pro nové produkty
    NULL     -- Default pro nové produkty
  )
  ON CONFLICT (product_code) 
  DO UPDATE SET
    product_name = EXCLUDED.product_name,
    description_short = EXCLUDED.description_short,
    description_long = EXCLUDED.description_long,
    category = EXCLUDED.category,
    url = EXCLUDED.url,
    thumbnail = EXCLUDED.thumbnail,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    availability = EXCLUDED.availability,
    in_action = EXCLUDED.in_action,
    sales_last_30_days = EXCLUDED.sales_last_30_days,
    sync_status = EXCLUDED.sync_status,
    last_sync_at = EXCLUDED.last_sync_at,
    updated_at = NOW(),
    -- DŮLEŽITÉ: ZACHOVÁME původní embedding_status a embedding_generated_at!
    embedding_status = product_feed_2.embedding_status,
    embedding_generated_at = product_feed_2.embedding_generated_at;
END;
$$;

-- Komentář k funkci
COMMENT ON FUNCTION upsert_product_feed_2_preserve_embedding IS 
'Upsert produktu do product_feed_2 se zachováním embedding_status a embedding_generated_at při UPDATE';

-- Test funkce
DO $$
DECLARE
  test_product_code VARCHAR := '2324';
  original_embedding_status VARCHAR;
  new_embedding_status VARCHAR;
BEGIN
  -- Ulož původní status
  SELECT embedding_status INTO original_embedding_status
  FROM product_feed_2
  WHERE product_code = test_product_code;
  
  RAISE NOTICE 'Původní embedding_status pro produkt %: %', test_product_code, COALESCE(original_embedding_status, 'NULL');
  
  -- Zkus upsert
  PERFORM upsert_product_feed_2_preserve_embedding(
    test_product_code,
    'Test produkt - update',
    'Test popis krátký',
    'Test popis dlouhý',
    'Test kategorie',
    'https://test.url',
    'https://test.thumbnail',
    100.00,
    'CZK',
    1,
    0,
    5,
    'success',
    NOW()
  );
  
  -- Zkontroluj nový status
  SELECT embedding_status INTO new_embedding_status
  FROM product_feed_2
  WHERE product_code = test_product_code;
  
  RAISE NOTICE 'Nový embedding_status pro produkt %: %', test_product_code, COALESCE(new_embedding_status, 'NULL');
  
  IF original_embedding_status IS NOT NULL AND original_embedding_status != new_embedding_status THEN
    RAISE WARNING '❌ CHYBA: embedding_status byl změněn z % na %!', original_embedding_status, new_embedding_status;
  ELSE
    RAISE NOTICE '✅ OK: embedding_status zůstal zachován';
  END IF;
END;
$$;

-- Hotovo
SELECT '✅ Funkce upsert_product_feed_2_preserve_embedding vytvořena' AS status;




