-- ================================================================
-- Přidání embedding_status sloupce do product_feed_2
-- ================================================================

-- Přidáme sloupec embedding_status pro sledování stavu embeddingu
ALTER TABLE public.product_feed_2 
ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'none';

-- Vytvoříme index pro rychlé filtrování podle embedding statusu
CREATE INDEX IF NOT EXISTS idx_product_feed_2_embedding_status 
ON public.product_feed_2(embedding_status);

-- Komentář k sloupci
COMMENT ON COLUMN public.product_feed_2.embedding_status IS 
'Stav embeddingu: none (žádný), pending (čeká), processing (zpracovává se), completed (hotovo), error (chyba)';

-- Přidáme sloupec pro datum vygenerování embeddingu
ALTER TABLE public.product_feed_2 
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.product_feed_2.embedding_generated_at IS 
'Datum a čas kdy byl embedding úspěšně vygenerován';

-- Výpis kontroly
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_feed_2'
  AND column_name IN ('embedding_status', 'embedding_generated_at')
ORDER BY ordinal_position;

