-- Přidání sloupce full_name do user_profiles tabulky

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Vytvoření indexu pro rychlejší vyhledávání podle jména
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name ON public.user_profiles(full_name);

