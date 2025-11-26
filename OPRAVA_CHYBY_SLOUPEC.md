# 🔧 Oprava chyby: Sloupec product_button_recommendations neexistuje

## ❌ Chyba

```
Could not find the 'product_button_recommendations' column of 'chatbot_settings' in the schema cache
```

## ✅ Řešení

Sloupec `product_button_recommendations` ještě nebyl přidán do databáze. Potřebuješ spustit SQL migraci.

## 📝 Postup (3 kroky)

### Krok 1: Otevři Supabase SQL Editor

1. Otevři https://supabase.com/dashboard
2. Vyber projekt **modopafybeslbcqjxsve**
3. Klikni na **SQL Editor** v levém menu
4. Klikni **New query**

### Krok 2: Zkopíruj a spusť SQL

Zkopíruj celý tento kód:

```sql
-- Přidej sloupec
ALTER TABLE chatbot_settings
ADD COLUMN IF NOT EXISTS product_button_recommendations BOOLEAN DEFAULT false;

-- Nastav výchozí hodnoty
UPDATE chatbot_settings
SET product_button_recommendations = false
WHERE product_button_recommendations IS NULL;

-- Kontrola
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,
    book_database
FROM chatbot_settings
ORDER BY chatbot_id;
```

Vlož do SQL Editoru a klikni **RUN** (nebo stiskni Ctrl+Enter)

### Krok 3: Refresh aplikace

1. Vrať se do aplikace
2. Stiskni **F5** (refresh)
3. Zkus znovu uložit nastavení chatbota

## 🎯 Výsledek

Po spuštění SQL by měl výstup vypadat takto:

```
✅ Sloupec přidán
✅ Výchozí hodnoty nastaveny

chatbot_id  | chatbot_name | product_rec. | button_rec. | book_db
------------|--------------|--------------|-------------|--------
sana_chat   | Sana Chat    | true         | false       | true
test_chat   | Test Chat    | false        | false       | false
```

## ✅ Verifikace

Po refreshi by mělo fungovat:
- ✅ Checkbox "Produktové doporučení na tlačítko" je viditelný
- ✅ Můžeš ho zaškrtnout
- ✅ Tlačítko "Uložit nastavení" funguje
- ✅ Žádná chyba v console

## 🐛 Pokud to stále nefunguje

### Zkontroluj sloupec v databázi

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'chatbot_settings' 
  AND column_name = 'product_button_recommendations';
```

**Očekávaný výstup:**
```
column_name                      | data_type | column_default
---------------------------------|-----------|---------------
product_button_recommendations   | boolean   | false
```

### Refresh schema cache v Supabase

Někdy Supabase cachuje schéma. Zkus:
1. V SQL Editoru spusť: `SELECT pg_notify('pgrst', 'reload schema');`
2. Počkej 5-10 sekund
3. Refresh aplikaci

### Hard refresh aplikace

1. Otevři DevTools (F12)
2. Pravé tlačítko na refresh buttonu
3. Vyber **"Empty Cache and Hard Reload"**

## 📋 Alternativní metoda: Z příkazové řádky

Pokud máš přístup k PostgreSQL klientovi:

```bash
# Připoj se k databázi
psql -h db.modopafybeslbcqjxsve.supabase.co -U postgres -d postgres

# Spusť příkaz
\i add_product_button_recommendations.sql

# Nebo přímo:
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS product_button_recommendations BOOLEAN DEFAULT false;
```

## 📚 Další informace

- **Kompletní migrace:** `add_product_button_recommendations.sql`
- **Quick fix:** `QUICK_FIX_MIGRATION.sql` (tento soubor)
- **Dokumentace:** `PRODUCT_BUTTON_QUICK_START.md`

---

**Poznámka:** Migrace je bezpečná - používá `IF NOT EXISTS`, takže ji můžeš spustit vícekrát bez problémů.

