-- Automatické potvrzení všech nových uživatelů
-- Toto je jednoduché řešení - všichni uživatelé se automaticky potvrdí

-- Funkce pro automatické potvrzení
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Pokud je uživatel vytvořen adminem, automaticky ho potvrdíme
  IF NEW.raw_user_meta_data->>'created_by_admin' = 'true' THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger který se spustí při vytváření nového uživatele
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();



