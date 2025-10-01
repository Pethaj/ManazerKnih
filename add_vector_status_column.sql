-- Přidání sloupce vector_status do tabulky books
ALTER TABLE public.books 
ADD COLUMN vector_status TEXT DEFAULT 'pending' CHECK (vector_status IN ('pending', 'success', 'error'));

-- Aktualizace existujících záznamů na 'pending'
UPDATE public.books 
SET vector_status = 'pending' 
WHERE vector_status IS NULL;

-- Komentář k sloupci
COMMENT ON COLUMN public.books.vector_status IS 'Stav nahrání knihy do vektorové databáze: pending (čeká), success (úspěšně nahráno), error (chyba)';
