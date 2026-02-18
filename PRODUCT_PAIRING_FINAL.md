# ✅ FINÁLNÍ IMPLEMENTACE: Product Pairing s Problem Classification

## 🎯 Jak to funguje

### Flow:

```
User: "Bolí mě hlava ze stresu"
         ↓
┌────────────────────────────────────────────┐
│ KROK 1: Problem Classification             │
│ → Identifikuje: ["Bolest hlavy – ze stresu"]│
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ KROK 2: N8N Webhook (bot response)         │
│ → Vrátí text o směsích na bolest hlavy     │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ KROK 3: Product Extractor                  │
│ → Extrahuje: ["NO", "NOSE", "004"]         │
│ → Product codes: ["918", "2288", "2737"]   │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ KROK 4: SQL Pairing (POUZE podle problému!)│
│ → SELECT * FROM leceni                      │
│   WHERE "Problém" = "Bolest hlavy – ze stresu"│
│ → Vrátí: [PRAWTEIN X, TČM Y, Aloe, Merkaba]│
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ KROK 5: MERGE + Deduplikace                │
│ Extrahované: ["NO", "NOSE", "004"]         │
│      +                                       │
│ Párované: ["PRAWTEIN X", "TČM Y"]          │
│      =                                       │
│ VÝSLEDEK: ["NO", "NOSE", "004",            │
│            "PRAWTEIN X", "TČM Y"]          │
│ (Duplicity odstraněny podle product_code)  │
└────────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ KROK 6: Prezentace v UI                    │
│ → Inline produktové tlačítka (extrahované) │
│ → + Doporučené produkty (párované)         │
│ → + Aloe/Merkaba doporučení                │
└────────────────────────────────────────────┘
```

## 🔧 Klíčové změny oproti předchozí verzi

### 1. SQL funkce **NEFILTRUJE** podle product_code
```sql
-- ❌ STARÝ PŘÍSTUP:
WHERE l.eo_1 = ANY(input_codes) OR l.eo_2 = ANY(input_codes) ...

-- ✅ NOVÝ PŘÍSTUP:
WHERE l."Problém" = ANY(problems)  -- POUZE podle problému!
```

### 2. SQL funkce **NEODSTRAŇUJE** duplicity
```sql
-- ❌ STARÝ PŘÍSTUP:
WHERE mp.product_code != ALL(input_codes)

-- ✅ NOVÝ PŘÍSTUP:
-- Žádné filtrování! Vrátíme VŠECHNY produkty pro problém
```

### 3. TypeScript funkce už nepřijímá `productCodes`
```typescript
// ❌ STARÝ PŘÍSTUP:
matchProductCombinationsWithProblems(problems, productCodes)

// ✅ NOVÝ PŘÍSTUP:
matchProductCombinationsWithProblems(problems)
```

### 4. Merge logika v `SanaChat.tsx`
```typescript
// Extrahované z N8N
const extractedProducts = webhookResult.matchedProducts || [];

// Párované ze SQL
const pairedProducts = pairingResult.products.map(...);

// SPOJENÍ
const allProducts = [...extractedProducts, ...pairedProducts];

// DEDUPLIKACE podle product_code
const uniqueProducts = Array.from(
  new Map(allProducts.map(p => [p.product_code, p])).values()
);

// NAHRAZENÍ
webhookResult.matchedProducts = uniqueProducts;
```

## 📊 Příklad OUTPUT v konzoli

```
🔍 Spouštím klasifikaci problému...
✅ Klasifikované problémy: ["Bolest hlavy – ze stresu"]

🔗 Spouštím párování kombinací...
🔍 Klasifikované problémy: ["Bolest hlavy – ze stresu"]

🔗 Párování kombinací produktů POUZE podle problému...
✅ SQL vrátilo produkty: 3
   - PRAWTEIN Frankincense Plus (Prawtein) [Problém: Bolest hlavy – ze stresu]
   - 004 - Eliminace větru (TČM) [Problém: Bolest hlavy – ze stresu]
   - Aloe Vera gel (Ostatní) [Problém: Bolest hlavy – ze stresu]

📦 Extrahované produkty z N8N: 4
🔗 Párované produkty ze SQL: 3

✅ Celkem unikátních produktů po spojení: 6
   - Extrahované: 4
   - Párované: 3
   - Duplicity odstraněny: 1

💧 Aloe doporučeno: true
✨ Merkaba doporučeno: false
```

## 🚀 Spuštění

### KROK 1: Spusť SQL migraci
```sql
-- V Supabase Dashboard → SQL Editor
-- Zkopíruj a spusť:
supabase/migrations/20260218_match_combinations_with_problems.sql
```

### KROK 2: Test SQL funkce
```sql
-- Načti všechny kombinace pro problém
SELECT * FROM match_product_combinations_with_problems(
  ARRAY['Bolest hlavy – ze stresu']::TEXT[]
);

-- Mělo by vrátit: Prawtein, TČM, Aloe, Merkaba pro tento problém
```

### KROK 3: Refresh aplikaci a testuj
```
1. Refresh prohlížeče (Ctrl+R nebo Cmd+R)
2. Otevři chat "EO-Smesi"
3. Zadej: "jaké jsou směsi na bolest hlavy"
4. Sleduj konzoli
```

## 📁 Upravené soubory

1. **SQL Migrace** (upraveno):
   - `supabase/migrations/20260218_match_combinations_with_problems.sql`
   - Odstraněn parametr `input_codes`
   - Filtruje POUZE podle problému

2. **Product Pairing Service** (upraveno):
   - `src/services/productPairingService.ts`
   - Funkce `matchProductCombinationsWithProblems(problems)` - bez product_codes
   - Vrací VŠECHNY produkty pro problém

3. **SanaChat** (upraveno):
   - `src/components/SanaChat/SanaChat.tsx`
   - Merge logika: spojení + deduplikace
   - Nahrazení `webhookResult.matchedProducts` spojenými produkty

## 🎯 Výhody tohoto přístupu

1. ✅ **SQL je jednodušší** - filtruje jen podle problému
2. ✅ **Všechny kombinace** - vrátí VŠECHNY produkty pro daný problém
3. ✅ **Merge v TypeScript** - flexibilnější deduplikace
4. ✅ **Transparentní** - vidíme přesně co se spojuje
5. ✅ **Rozšiřitelné** - snadné přidat další zdroje produktů

## 🔍 Deduplikace produktů

Produkty se deduplikují podle `product_code`:

```typescript
// Pokud máme:
extractedProducts = [
  { product_code: "918", product_name: "NO" },
  { product_code: "2288", product_name: "NOSE" }
]

pairedProducts = [
  { product_code: "918", product_name: "NO esenciální olej" },  // DUPLICITA!
  { product_code: "FRANK", product_name: "PRAWTEIN Frankincense" }
]

// Po merge + deduplikaci:
uniqueProducts = [
  { product_code: "918", product_name: "NO" },  // První výskyt (z extractedProducts)
  { product_code: "2288", product_name: "NOSE" },
  { product_code: "FRANK", product_name: "PRAWTEIN Frankincense" }
]
// Produkt "918" je jen jednou (duplicita odstraněna)
```

## 📋 Checklist před nasazením

- [ ] SQL migrace spuštěna
- [ ] Test SQL: `SELECT * FROM match_product_combinations_with_problems(...)`
- [ ] Tabulka `leceni` má data
- [ ] Checkbox "Párování kombinací produktů" zapnut v EO-Smesi
- [ ] Refresh aplikace
- [ ] Test: "jaké jsou směsi na bolest hlavy"

---

**Status:** ✅ Připraveno k nasazení  
**Datum:** 2026-02-18  
**Autor:** Petr Hajduk
