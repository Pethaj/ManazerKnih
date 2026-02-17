# Fix: Matching pro Směsi Esenciálních Olejů

**Datum:** 2026-02-17  
**Verze:** productNameMatchingService 2.1  
**Problém:** NOHEPA a další směsi EO se špatně párují v product pills

## 🐛 Popis problému

Z console logu:
```
🔍 "NOHEPA" → ✅ 075 - Po svatbě (0.16)
```

NOHEPA (ID 3730) byl špatně namapován na produkt "075 - Po svatbě" s velmi nízkou podobností (16%).

### Příčina

Produkty v kategorii "Směs esenciálních olejů" mají v databázi názvy ve formátu:
- `NOHEPA esenciální olej`
- `NO esenciální olej`
- `NOPA esenciální olej`

Ale GPT identifikuje pouze první slovo (název směsi):
- `NOHEPA`
- `NO`
- `NOPA`

Matching služba nemohla správně spárovat `"NOHEPA"` s `"NOHEPA esenciální olej"`, protože suffix "esenciální olej" snižoval podobnost.

## ✅ Řešení

### 1. Rozšíření SQL funkce o kategorii

**Soubor:** `supabase/migrations/20260217_add_category_to_pinyin_function.sql`

Aktualizována funkce `get_products_with_pinyin_names()` tak, aby vracela také kategorii produktu:

```sql
CREATE OR REPLACE FUNCTION public.get_products_with_pinyin_names()
RETURNS TABLE (
  ...,
  category TEXT  -- 🆕 NOVĚ
)
```

### 2. Vylepšení matching logiky

**Soubor:** `src/services/productNameMatchingService.ts` (verze 2.1)

**Změny:**

1. **Rozpoznání kategorie směsí EO:**
   ```typescript
   function isEssentialOilBlendCategory(category: string): boolean {
     return category.includes('směs') && category.includes('esenciální')
   }
   ```

2. **Normalizace textu pro směsi EO:**
   ```typescript
   function normalizeText(text: string, isEssentialOilBlend: boolean) {
     let normalized = /* standardní normalizace */
     
     // Pro směsi EO: odstraníme suffix "esencialni olej"
     if (isEssentialOilBlend) {
       normalized = normalized.replace(/\s*esencialni\s+olej\s*$/i, '')
     }
     
     return normalized
   }
   ```

3. **Zvýšená priorita exact match pro směsi EO:**
   ```typescript
   function calculateSimilarity(str1, str2, isEssentialOilBlend) {
     // Pro směsi EO: "nohepa" === "nohepa esencialni olej" → 0.98 (místo 0.95)
     if (longer === shorter && isEssentialOilBlend) {
       return 0.98
     }
   }
   ```

### 3. Vylepšený debug logging

Console logy nyní ukazují, když je produkt směs EO:

```
🔍 "NOHEPA" → ✅ NOHEPA esenciální olej (0.98) 🌿 EO
```

## 📋 Postup nasazení

### Krok 1: Spustit SQL migraci

**Možnost A: Supabase Dashboard**
```bash
# Zobrazit SQL pro kopírování
npx tsx show-migration-sql.ts

# Poté:
# 1. Otevřít: https://supabase.com/dashboard/project/modopafybeslbcqjxsve/sql/new
# 2. Zkopírovat SQL z konzole
# 3. Kliknout "RUN"
```

**Možnost B: Manuálně**

Spustit obsah souboru:
```
supabase/migrations/20260217_add_category_to_pinyin_function.sql
```

v Supabase SQL Editoru.

### Krok 2: Restartovat aplikaci

```bash
# Zastavit dev server (Ctrl+C)
npm run dev
```

### Krok 3: Testování

```bash
# Spustit test matching
npx tsx test-eo-blend-matching.ts
```

**Očekávaný výsledek:**
```
✅ NOHEPA namapován na: NOHEPA esenciální olej
   ID produktu: 3730
   Očekávané ID: 3730
   Podobnost: 98.0%
   Kategorie: Směs esenciálních olejů

🎉 ÚSPĚCH! NOHEPA je správně namapován na ID 3730
```

### Krok 4: Ověření v prohlížeči

1. Otevřít chatbot EO-Smesi
2. Zeptat se: "jake jsou smesi EO proti bolesti hlavy"
3. Zkontrolovat console log - měl by obsahovat:

```
🔢 MATCHING SERVICE VERSION: 2.1 (2026-02-17 - EO Blends Support)
🔍 "NOHEPA" → ✅ NOHEPA esenciální olej (0.98) 🌿 EO
```

4. Ověřit, že NOHEPA product pill je správně zobrazen v odpovědi

## 🔍 Technické detaily

### Kategorie směsí EO

Rozpoznávány jsou následující kategorie:
- "Směs esenciálních olejů"
- "Směsi esenciálních olejů"
- "Smes esencialnich oleju" (bez diakritiky)
- Jakákoliv obsahující "směs" + "esenciální"

### Matching algoritmus pro směsi EO

1. **Detekce kategorie:** `isEssentialOilBlendCategory(product.category)`
2. **Normalizace produktu:** `"NOHEPA esenciální olej"` → `"nohepa"`
3. **Normalizace GPT:** `"NOHEPA"` → `"nohepa"`
4. **Porovnání:** `"nohepa" === "nohepa"` → podobnost 98%
5. **Bonus za kategorii:** +3% oproti standardním produktům

### Zpětná kompatibilita

- Ostatní produkty (wany, prawteiny, atd.) fungují stejně jako předtím
- Směsi EO mají pouze vylepšený matching
- Žádné breaking changes

## 🧪 Testovací případy

| GPT identifikace | Očekávaný produkt | Kategorie | Min. podobnost |
|------------------|-------------------|-----------|----------------|
| NOHEPA | NOHEPA esenciální olej | Směs EO | 95% |
| NO | NO esenciální olej | Směs EO | 95% |
| NOPA | NOPA esenciální olej | Směs EO | 95% |
| Chuan Xiong Cha Tiao Wan | 004 - Eliminace větru | Wan | 90% |
| 004 | 004 - Eliminace větru | Wan | 95% |

## 📝 Soubory změněné

1. ✅ `src/services/productNameMatchingService.ts` (verze 2.0 → 2.1)
   - Přidána funkce `isEssentialOilBlendCategory()`
   - Upravena funkce `normalizeText()` (nový parametr)
   - Upravena funkce `calculateSimilarity()` (nový parametr)
   - Vylepšen debug logging

2. ✅ `supabase/migrations/20260217_add_category_to_pinyin_function.sql` (nový)
   - Rozšíření `get_products_with_pinyin_names()` o kategorii

3. ✅ `create_pinyin_matching_function.sql` (aktualizován)
   - Rozšíření funkce o kategorii (lokální kopie)

4. ✅ `test-eo-blend-matching.ts` (nový)
   - Automatický test pro ověření fungování

5. ✅ `show-migration-sql.ts` (nový)
   - Helper skript pro zobrazení SQL migrace

## 🎯 Výsledek

Po aplikaci změn:

**Před:**
```
🔍 "NOHEPA" → ✅ 075 - Po svatbě (0.16) ❌
```

**Po:**
```
🔍 "NOHEPA" → ✅ NOHEPA esenciální olej (0.98) 🌿 EO ✅
```

Product pills pro směsi esenciálních olejů jsou nyní správně mapovány!

## 🔄 Rollback (v případě problémů)

Pokud by nastaly problémy, vrátit SQL funkci na původní verzi:

```sql
CREATE OR REPLACE FUNCTION public.get_products_with_pinyin_names()
RETURNS TABLE (
  id BIGINT,
  product_code VARCHAR,
  product_name VARCHAR,
  description_short TEXT,
  pinyin_name TEXT,
  url TEXT
  -- BEZ category
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pf2.id,
    pf2.product_code,
    pf2.product_name,
    pf2.description_short,
    trim(regexp_replace(
      (regexp_match(pf2.description_short, '^\*\*([^*]+)\*\*'))[1],
      '^[0-9]+\s*[–-]?\s*',
      ''
    )) as pinyin_name,
    pf2.url
    -- BEZ pf2.category
  FROM public.product_feed_2 pf2
  WHERE pf2.description_short ~ '^\*\*[^*]+\*\*'
    AND pf2.url IS NOT NULL
  ORDER BY pf2.id;
END;
$$ LANGUAGE plpgsql;
```

A vrátit `productNameMatchingService.ts` na verzi 2.0 (git revert).

---

**Autor:** AI Assistant  
**Review:** Čeká na uživatelské testování
