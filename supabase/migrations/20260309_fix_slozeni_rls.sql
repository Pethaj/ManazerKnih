-- MIGRACE: Přidání RLS politik pro tabulku slozeni
-- Datum: 2026-03-09
-- Popis: Tabulka slozeni měla zapnuté RLS bez politik, což blokovala čtení
--        pro anonymní i přihlášené uživatele. Frontend (EO Směsi chatbot)
--        nemohl načíst složení směsí -> tabulka účinných látek se nezobrazovala.

CREATE POLICY "Allow read for anon users"
  ON public.slozeni
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow read for authenticated users"
  ON public.slozeni
  FOR SELECT
  TO authenticated
  USING (true);
