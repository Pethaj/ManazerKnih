# 🚀 SPUŠTĚNÍ: SQL Migrace pro Product Pairing s Problémy

## 📋 Co dělá tato migrace

Vytváří novou SQL funkci `match_product_combinations_with_problems()`, která:
- ✅ Filtruje záznamy v tabulce `leceni` podle **problému** (case-insensitive)
- ✅ Filtruje podle **product_code** v sloupcích `EO 1`, `EO 2`, `EO 3`
- ✅ Vrací napárované produkty (Prawtein, TČM wan, Aloe, Merkaba)

## 🔧 Jak spustit migraci

### Varianta 1: Supabase Dashboard (Doporučeno)

1. Otevři Supabase Dashboard: https://supabase.com/dashboard
2. Zvol projekt
3. Naviguj: **SQL Editor** → **New query**
4. Zkopíruj obsah souboru:
   ```
   supabase/migrations/20260218_match_combinations_with_problems.sql
   ```
5. Vlož do SQL Editoru
6. Klikni **Run** (nebo Ctrl+Enter)

### Varianta 2: Supabase CLI

```bash
# Z root složky projektu
supabase db push
```

Nebo:

```bash
# Spusť konkrétní migraci
supabase db execute --file supabase/migrations/20260218_match_combinations_with_problems.sql
```

## 🧪 Testování SQL funkce

Po spuštění migrace otestuj funkci v SQL Editoru:

### Test 1: Pouze problém (bez EO filtrování)
```sql
SELECT * FROM match_product_combinations_with_problems(
  ARRAY['Bolest hlavy – ze stresu']::TEXT[],
  NULL::TEXT[]
);
```

**Očekávaný výsledek:** Všechny Prawtein/TČM produkty pro "Bolest hlavy – ze stresu"

### Test 2: Problém + EO produkty
```sql
SELECT * FROM match_product_combinations_with_problems(
  ARRAY['Bolest hlavy – ze stresu']::TEXT[],
  ARRAY['NO', 'NOSE']::TEXT[]
);
```

**Očekávaný výsledek:** Produkty pro "Bolest hlavy – ze stresu", které mají NO nebo NOSE v EO 1/2/3

### Test 3: Pouze EO (žádný problém)
```sql
SELECT * FROM match_product_combinations_with_problems(
  NULL::TEXT[],
  ARRAY['NOHEPA']::TEXT[]
);
```

**Očekávaný výsledek:** Všechny kombinace, které mají NOHEPA v EO 1/2/3

### Test 4: Validace práv
```sql
-- Zkontroluj, že funkce má správná oprávnění
SELECT 
  routine_name, 
  routine_schema,
  data_type
FROM information_schema.routines
WHERE routine_name = 'match_product_combinations_with_problems';
```

## 📊 Struktura výstupu

Funkce vrací tabulku s těmito sloupci:

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `matched_product_code` | TEXT | Product code napárovaného produktu |
| `matched_category` | TEXT | Kategorie ("Prawtein" nebo "TČM - Tradiční čínská medicína") |
| `matched_product_name` | TEXT | Název produktu z product_feed_2 |
| `matched_product_url` | TEXT | URL produktu |
| `matched_thumbnail` | TEXT | Thumbnail obrázek |
| `aloe_recommended` | TEXT | "ano" nebo "ne" |
| `merkaba_recommended` | TEXT | "ano" nebo "ne" |
| `combination_name` | TEXT | Název kombinace z tabulky leceni |
| `matched_problem` | TEXT | 🆕 Problém, pro který byla kombinace nalezena |

## 🔍 Jak to funguje v aplikaci

### 1. User zadá dotaz
```
"Bolí mě hlava ze stresu"
```

### 2. Problem Classifier identifikuje problém
```typescript
classifiedProblems = ["Bolest hlavy – ze stresu"]
```

### 3. Product Extractor najde produkty v odpovědi
```typescript
extractedProducts = ["NO", "NOSE", "Chuan Xiong Cha Tiao Wan"]
productCodes = ["918", "2288", "2737"]
```

### 4. Product Pairing Service volá SQL
```typescript
const result = await matchProductCombinationsWithProblems(
  ["Bolest hlavy – ze stresu"],
  ["918", "2288", "2737"]
);
```

### 5. SQL funkce najde kombinace
```sql
-- Filtruje leceni kde:
-- "Problém" = "Bolest hlavy – ze stresu"
-- A (eo_1 IN ('918','2288','2737') 
--    OR eo_2 IN ('918','2288','2737')
--    OR eo_3 IN ('918','2288','2737'))
```

### 6. Vrátí napárované produkty
```typescript
{
  products: [
    { product_code: "FRANKINCENSE_PLUS", product_name: "PRAWTEIN Frankincense Plus", ... },
    { product_code: "004", product_name: "004 - Eliminace větru", ... }
  ],
  aloe: true,
  merkaba: false
}
```

## ⚠️ Troubleshooting

### Problem 1: "function match_product_combinations_with_problems does not exist"

**Příčina:** Migrace nebyla spuštěna nebo selhala

**Řešení:**
```sql
-- Zkontroluj, zda funkce existuje
SELECT * FROM pg_proc WHERE proname = 'match_product_combinations_with_problems';

-- Pokud ne, spusť migraci znovu
```

### Problem 2: "permission denied for function"

**Příčina:** Chybí GRANT oprávnění

**Řešení:**
```sql
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems TO authenticated;
GRANT EXECUTE ON FUNCTION match_product_combinations_with_problems TO anon;
```

### Problem 3: Žádné výsledky, i když by měly být

**Příčina:** Case-sensitivity nebo whitespace v názvech problémů

**Řešení:**
```sql
-- Zkontroluj přesné názvy problémů v tabulce
SELECT DISTINCT "Problém" FROM leceni ORDER BY "Problém";

-- Zkontroluj, zda tam je "Bolest hlavy – ze stresu" (s pomlčkou!)
```

### Problem 4: Vrací produkty, které by neměly být

**Příčina:** Product_code v input_codes se shoduje s produktem v prawtein/tcm_wan

**Řešení:** SQL funkce automaticky filtruje duplikáty:
```sql
WHERE mp.product_code != ALL(input_codes)
```

## 📝 Checklist před testováním

- [ ] SQL migrace spuštěna
- [ ] Funkce existuje (SELECT * FROM pg_proc...)
- [ ] Tabulka `leceni` má data
- [ ] Sloupce `"Problém"`, `eo_1`, `eo_2`, `eo_3` jsou vyplněné
- [ ] Tabulka `product_feed_2` má produkty
- [ ] Test SQL queries fungují

## 🚀 Další kroky

Po úspěšné migraci:

1. ✅ Refresh aplikaci (aby načetla novou funkci)
2. ✅ Otevři chat "EO-Smesi"
3. ✅ Zadej: "jaké jsou směsi na bolest hlavy"
4. ✅ Sleduj konzoli:
   ```
   🔍 Spouštím klasifikaci problému...
   ✅ Klasifikované problémy: ["Bolest hlavy – ze stresu"]
   📦 Produkty (Product Extractor): ["918", "2288", "2737"]
   🔗 Spouštím párování kombinací...
   ✅ Napárováno produktů: 2
   ```

---

**Autor:** Petr Hajduk  
**Datum:** 2026-02-18  
**Status:** ✅ Připraveno k nasazení
