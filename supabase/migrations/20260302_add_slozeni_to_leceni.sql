-- ============================================================================
-- MIGRACE: Přidání sloupců EO1_slozeni a EO2_slozeni do tabulky leceni
-- Datum: 2026-03-02
-- Popis: Propojení tabulky slozeni s tabulkou leceni.
--        Sloupce budou naplněny edge funkcí sync-slozeni.
-- ============================================================================

-- Přidání sloupce EO1_slozeni
ALTER TABLE public.leceni
ADD COLUMN IF NOT EXISTS "EO1_slozeni" TEXT;

-- Přidání sloupce EO2_slozeni
ALTER TABLE public.leceni
ADD COLUMN IF NOT EXISTS "EO2_slozeni" TEXT;

-- Komentáře ke sloupcům
COMMENT ON COLUMN public.leceni."EO1_slozeni" IS 'Složení esenciálního oleje EO1 - načteno z tabulky slozeni podle blend_name';
COMMENT ON COLUMN public.leceni."EO2_slozeni" IS 'Složení esenciálního oleje EO2 - načteno z tabulky slozeni podle blend_name';
