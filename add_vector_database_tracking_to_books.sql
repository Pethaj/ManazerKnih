-- ================================================================
-- Přidání detailního trackingu vektorových databází do books
-- ================================================================
-- Migrace: add_vector_database_tracking_to_books
-- Datum: 2026-01-12
-- Účel: Sledování statusu nahrání do jednotlivých vektorových databází
--       (Qdrant Local, Qdrant Cloud, Supabase)

-- ====================
-- 1. SLOUPCE PRO STATUS JEDNOTLIVÝCH DATABÁZÍ
-- ====================

-- Qdrant Local status
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS qdrant_local_status VARCHAR(20) DEFAULT 'none'
CHECK (qdrant_local_status IN ('none', 'success', 'error'));

-- Qdrant Cloud status
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS qdrant_cloud_status VARCHAR(20) DEFAULT 'none'
CHECK (qdrant_cloud_status IN ('none', 'success', 'error'));

-- Supabase Vector status
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS supabase_vector_status VARCHAR(20) DEFAULT 'none'
CHECK (supabase_vector_status IN ('none', 'success', 'error'));

-- ====================
-- 2. SLOUPCE PRO DETAILY A CHYBOVÉ ZPRÁVY
-- ====================

-- JSON s kompletními detaily uploadu (pro debugging a audit)
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS vector_upload_details JSONB;

-- Datum posledního pokusu o upload
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS last_vector_upload_at TIMESTAMPTZ;

-- ====================
-- 3. INDEXY PRO RYCHLÉ VYHLEDÁVÁNÍ
-- ====================

-- Index pro filtrování podle Qdrant Local statusu
CREATE INDEX IF NOT EXISTS idx_books_qdrant_local_status 
ON public.books(qdrant_local_status);

-- Index pro filtrování podle Qdrant Cloud statusu
CREATE INDEX IF NOT EXISTS idx_books_qdrant_cloud_status 
ON public.books(qdrant_cloud_status);

-- Index pro filtrování podle Supabase Vector statusu
CREATE INDEX IF NOT EXISTS idx_books_supabase_vector_status 
ON public.books(supabase_vector_status);

-- Index pro JSONB vyhledávání
CREATE INDEX IF NOT EXISTS idx_books_vector_upload_details 
ON public.books USING gin(vector_upload_details);

-- ====================
-- 4. KOMENTÁŘE K SLOUPCŮM
-- ====================

COMMENT ON COLUMN public.books.qdrant_local_status IS 
'Status nahrání do Qdrant Local: none (žádný pokus), success (úspěšně), error (chyba)';

COMMENT ON COLUMN public.books.qdrant_cloud_status IS 
'Status nahrání do Qdrant Cloud: none (žádný pokus), success (úspěšně), error (chyba)';

COMMENT ON COLUMN public.books.supabase_vector_status IS 
'Status nahrání do Supabase Vector DB: none (žádný pokus), success (úspěšně), error (chyba)';

COMMENT ON COLUMN public.books.vector_upload_details IS 
'JSON objekt s kompletními detaily uploadu - odpověď z N8N webhoku, chybové zprávy, timestamp jednotlivých operací';

COMMENT ON COLUMN public.books.last_vector_upload_at IS 
'Datum a čas posledního pokusu o nahrání do vektorových databází';

-- ====================
-- 5. AKTUALIZACE STARÉHO SLOUPCE Vdtb
-- ====================

-- Pro knihy, které mají Vdtb = 'success', nastavíme všechny DB na success
UPDATE public.books
SET 
  qdrant_local_status = 'success',
  qdrant_cloud_status = 'success',
  supabase_vector_status = 'success',
  last_vector_upload_at = COALESCE(vector_added_at, updated_at, created_at)
WHERE \"Vdtb\" = 'success'
  AND qdrant_local_status = 'none';

-- ====================
-- 6. VALIDAČNÍ DOTAZY
-- ====================

-- Výpis nových sloupců
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'books'
  AND column_name IN (
    'qdrant_local_status', 
    'qdrant_cloud_status', 
    'supabase_vector_status',
    'vector_upload_details',
    'last_vector_upload_at'
  )
ORDER BY ordinal_position;

-- Statistika statusů po migraci
SELECT 
  \"Vdtb\" as old_status,
  qdrant_local_status,
  qdrant_cloud_status,
  supabase_vector_status,
  COUNT(*) as count
FROM books
GROUP BY \"Vdtb\", qdrant_local_status, qdrant_cloud_status, supabase_vector_status
ORDER BY count DESC;
