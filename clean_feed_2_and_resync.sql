-- =====================================================
-- Vyčištění Product Feed 2 pro novou synchronizaci
-- =====================================================
-- Po opravě HTML entit v Edge Function je nutné:
-- 1. Vymazat staré záznamy s chybnými HTML entitami
-- 2. Vymazat související embeddings
-- 3. Spustit novou synchronizaci

-- =====================================================
-- KROK 1: Kontrola aktuálního stavu
-- =====================================================

-- Zkontrolovat produkty s HTML entitami
SELECT 
  COUNT(*) as pocet_s_html_entitami,
  COUNT(*) FILTER (WHERE product_name LIKE '%&#x%' OR product_name LIKE '%&#%') as nazvy_s_entitami,
  COUNT(*) FILTER (WHERE description_short LIKE '%&#x%' OR description_short LIKE '%&#%') as kratke_popisy_s_entitami,
  COUNT(*) FILTER (WHERE description_long LIKE '%&#x%' OR description_long LIKE '%&#%') as dlouhe_popisy_s_entitami
FROM product_feed_2;

-- Ukázat příklady produktů s HTML entitami
SELECT 
  product_code,
  product_name,
  description_short,
  category
FROM product_feed_2
WHERE 
  product_name LIKE '%&#x%' 
  OR product_name LIKE '%&#%'
  OR description_short LIKE '%&#x%'
  OR description_short LIKE '%&#%'
LIMIT 10;

-- =====================================================
-- KROK 2: Backup dat (volitelné)
-- =====================================================

-- Pokud chcete zachovat data před vymazáním:
/*
CREATE TABLE product_feed_2_backup_20241125 AS
SELECT * FROM product_feed_2;
*/

-- =====================================================
-- KROK 3: Vymazání embeddings pro Feed 2
-- =====================================================

-- Vymazat všechny embeddings pro produkty z Feed 2
DELETE FROM product_embeddings
WHERE feed_source = 'feed_2';

-- Ověření
SELECT COUNT(*) as pocet_embeddings_feed_2
FROM product_embeddings
WHERE feed_source = 'feed_2';
-- Očekávaný výsledek: 0

-- =====================================================
-- KROK 4: Vymazání produktů Feed 2
-- =====================================================

-- Vymazat všechny produkty Feed 2
DELETE FROM product_feed_2;

-- Ověření
SELECT COUNT(*) as pocet_produktu_feed_2
FROM product_feed_2;
-- Očekávaný výsledek: 0

-- =====================================================
-- KROK 5: Restartování ID sekvence (volitelné)
-- =====================================================

-- Pokud chcete začít ID od 1
/*
ALTER SEQUENCE product_feed_2_id_seq RESTART WITH 1;
*/

-- =====================================================
-- PO SPUŠTĚNÍ TOHOTO SKRIPTU:
-- =====================================================
-- 1. Deploy Edge Function s opravou:
--    npx supabase functions deploy sync-feed-2
--
-- 2. Spustit Edge Function manuálně:
--    curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-feed-2 \
--      -H "Authorization: Bearer YOUR_ANON_KEY"
--
-- 3. Nebo počkat na automatické spuštění cron job (každou hodinu)
--
-- 4. Po synchronizaci ověřit data:

-- =====================================================
-- KROK 6: Ověření nových dat
-- =====================================================

-- Zkontrolovat, že již nejsou HTML entity
SELECT 
  product_code,
  product_name,
  description_short,
  category
FROM product_feed_2
WHERE 
  product_name LIKE '%&#x%' 
  OR product_name LIKE '%&#%'
  OR description_short LIKE '%&#x%'
  OR description_short LIKE '%&#%';
-- Očekávaný výsledek: 0 řádků

-- Zkontrolovat konkrétní produkt 2233
SELECT 
  product_code,
  product_name,
  description_short,
  category,
  price,
  url
FROM product_feed_2
WHERE product_code = '2233';
-- Očekávaný název: "001 - Rozptýlení větru" (správné české znaky)

-- Zkontrolovat celkový počet produktů
SELECT 
  COUNT(*) as celkem_produktu,
  COUNT(*) FILTER (WHERE sync_status = 'success') as uspesne_synced,
  COUNT(*) FILTER (WHERE sync_status = 'error') as chyby,
  MIN(last_sync_at) as prvni_sync,
  MAX(last_sync_at) as posledni_sync
FROM product_feed_2;

-- Zkontrolovat embeddings
SELECT 
  COUNT(*) as celkem_embeddings_feed_2,
  COUNT(DISTINCT product_code) as unikatnich_produktu
FROM product_embeddings
WHERE feed_source = 'feed_2';

-- =====================================================
-- POZNÁMKY
-- =====================================================
-- - Synchronizace může trvat několik minut podle velikosti feedu
-- - N8N webhook pro embeddings běží asynchronně
-- - Embeddings mohou být vytvořeny až několik minut po uložení produktů
-- - Pro force resync můžete skript spustit znovu




