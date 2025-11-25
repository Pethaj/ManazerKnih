-- ================================================================
-- KONTROLA SLOUPCŮ V TABULCE product_feed_2
-- ================================================================

-- 1. Zkontroluj, zda sloupce existují
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_feed_2'
ORDER BY ordinal_position;

-- 2. Zkontroluj konkrétně embedding sloupce
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_feed_2'
  AND column_name IN ('embedding_status', 'embedding_generated_at');

-- 3. Zkontroluj RLS (Row Level Security) policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_feed_2';

-- 4. Zkontroluj, zda je RLS vůbec zapnuté
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'product_feed_2';

-- 5. Test - zkus manuálně aktualizovat jeden záznam
-- (POZOR: Změň product_code na nějaký skutečný z tvé databáze)
UPDATE product_feed_2 
SET 
  embedding_status = 'completed',
  embedding_generated_at = NOW()
WHERE product_code = '2347'
RETURNING id, product_code, embedding_status, embedding_generated_at;

