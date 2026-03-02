-- ============================================================================
-- EXTRACT: EO1_slozeni a EO2_slozeni z tabulky leceni
-- Spusť v Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- 1) Prostý výběr pro kopírování do Excel/Sheets (oddělovač TAB)
SELECT 
  id,
  nazev,
  "EO1_slozeni",
  "EO2_slozeni"
FROM leceni
ORDER BY id;

-- 2) Export jen EO1_slozeni a EO2_slozeni (bez id/nazev)
-- SELECT "EO1_slozeni", "EO2_slozeni" FROM leceni ORDER BY id;

-- 3) Generování INSERTů pro vložení do jiné tabulky
-- (předpokládá, že cílová tabulka má sloupce: id, eo1_slozeni, eo2_slozeni)
/*
SELECT 
  'INSERT INTO jina_tabulka (id, eo1_slozeni, eo2_slozeni) VALUES (' 
  || id 
  || ', ' || COALESCE('''' || REPLACE("EO1_slozeni", '''', '''''') || '''', 'NULL')
  || ', ' || COALESCE('''' || REPLACE("EO2_slozeni", '''', '''''') || '''', 'NULL')
  || ');' AS insert_statement
FROM leceni
ORDER BY id;
*/
