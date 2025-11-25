-- ================================================================
-- OPRAVA RLS PRO UPDATE V TABULCE product_feed_2
-- ================================================================

-- 1. Zkontroluj současné RLS policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'product_feed_2';

-- 2. Pokud není RLS zapnuté, zapni ho
ALTER TABLE product_feed_2 ENABLE ROW LEVEL SECURITY;

-- 3. Vytvoř policy pro UPDATE pro authenticated uživatele
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON product_feed_2;

CREATE POLICY "Allow authenticated users to update products"
ON product_feed_2
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Ujisti se, že existuje i policy pro SELECT (aby se produkty mohly číst)
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON product_feed_2;

CREATE POLICY "Allow authenticated users to read products"
ON product_feed_2
FOR SELECT
TO authenticated
USING (true);

-- 5. Policy pro anon uživatele (pokud je potřeba)
DROP POLICY IF EXISTS "Allow anon users to read products" ON product_feed_2;

CREATE POLICY "Allow anon users to read products"
ON product_feed_2
FOR SELECT
TO anon
USING (true);

-- 6. Kontrola - zobraz všechny policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_feed_2'
ORDER BY cmd, policyname;

-- 7. Test UPDATE
-- (Změň product_code na nějaký skutečný z tvé databáze)
UPDATE product_feed_2 
SET 
  embedding_status = 'completed',
  embedding_generated_at = NOW()
WHERE product_code = '2347'
RETURNING id, product_code, embedding_status, embedding_generated_at;

