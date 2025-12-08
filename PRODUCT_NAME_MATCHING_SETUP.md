# Product Name Matching - Setup a Dokumentace

## Přehled

Systém pro automatické vyhledávání produktů v databázi na základě názvů identifikovaných GPT v chatbot odpovědích.

## Jak to funguje

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GPT odpoví v chatu (N8N Webhook)                         │
│    Např: "Doporučuji Te Xiao Bi Min Gan Wan pro nos..."    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Screening (GPT-4o-mini via Edge Function)                │
│    Extrahuje názvy: ["Te Xiao Bi Min Gan Wan", "009"]      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Matching Service                                          │
│    Načte produkty z DB s pinyin_name                        │
│    Fuzzy matching: Te Xiao Bi Min Gan Wan ≈ Čistý dech     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Console Output                                            │
│    ✅ Match: "Te Xiao..." → "Čistý dech" (95%)             │
│    🔗 URL: https://bewit.love/produkt/cisty-dech           │
└─────────────────────────────────────────────────────────────┘
```

## Instalace

### 1. Aplikuj SQL funkci

Spusť SQL soubor `create_pinyin_matching_function.sql` v Supabase SQL Editoru:

```bash
# Přes Supabase Dashboard
1. Jdi na: Project → SQL Editor
2. Vlož obsah souboru create_pinyin_matching_function.sql
3. Klikni "Run"
```

Nebo přes CLI:

```bash
supabase db execute -f create_pinyin_matching_function.sql
```

### 2. Ověř instalaci

```sql
-- Test funkce
SELECT * FROM get_products_with_pinyin_names() LIMIT 10;

-- Měl by vrátit produkty s pinyin_name
-- Např:
-- id | product_code | product_name      | pinyin_name              | url
-- 1  | 2347        | 009 - Čistý dech  | Te Xiao Bi Min Gan Wan  | https://...
```

## Použití

### Automatické (v chatu)

Systém běží automaticky při každé odpovědi z chatbotu:

1. Uživatel se zeptá v chatu
2. GPT odpoví
3. Automaticky se spustí screening + matching
4. Výsledky se vypíšou do konzole (F12 → Console)

**Příklad konzole outputu:**

```
🔍 Zahajuji screening a matching produktů z odpovědi...
📦 GPT identifikoval 3 produktů/témat: ["Te Xiao Bi Min Gan Wan", "bolest hlavy", "009"]
🔍 Zahajuji matching názvů produktů...
📝 Počet názvů k vyhledání: 3
✅ Načteno 150 produktů z databáze
✅ Match: "Te Xiao Bi Min Gan Wan" → "Te Xiao Bi Min Gan Wan" (100%)
   🔗 URL: https://bewit.love/produkt/bewit-cisty-dech
✅ Match: "009" → "Te Xiao Bi Min Gan Wan" (85%)
   🔗 URL: https://bewit.love/produkt/bewit-cisty-dech
❌ Nenalezen match pro: "bolest hlavy"

============================================================
📊 SHRNUTÍ MATCHINGU PRODUKTŮ
============================================================
✅ Nalezeno: 2 produktů
❌ Nenalezeno: 1 produktů

🔗 URL NALEZENÝCH PRODUKTŮ:
1. 009 - Čistý dech
   Pinyin: Te Xiao Bi Min Gan Wan
   URL: https://bewit.love/produkt/bewit-cisty-dech
   Shoda: 100%
2. 009 - Čistý dech
   Pinyin: Te Xiao Bi Min Gan Wan
   URL: https://bewit.love/produkt/bewit-cisty-dech
   Shoda: 85%

⚠️ NENALEZENÉ PRODUKTY:
1. bolest hlavy
============================================================
```

### Manuální testování

V konzoli prohlížeče (F12):

```javascript
// Import služeb
const { screenTextForProducts } = await import('./services/inlineProductScreeningService');
const { matchProductNames } = await import('./services/productNameMatchingService');

// Test text
const testText = "Doporučuji Te Xiao Bi Min Gan Wan (009) pro bolest hlavy a nosní průchodnost.";

// 1. Screening
const screening = await screenTextForProducts(testText);
console.log('Screening result:', screening);

// 2. Matching
const matching = await matchProductNames(screening.products);
console.log('Matching result:', matching);
```

Nebo použij připravené test funkce:

```javascript
// Test screeningu
const { testProductScreening } = await import('./services/inlineProductScreeningService');
await testProductScreening();

// Test matchingu
const { testProductMatching } = await import('./services/productNameMatchingService');
await testProductMatching();
```

## Technické detaily

### Pinyin Name Extrakce

`pinyin_name` se generuje z `description_short` pomocí regex:

```sql
trim(regexp_replace(
  (regexp_match(description_short, '^\*\*([^*]+)\*\*'))[1],
  '^[0-9]+\s*[–-]?\s*',
  ''
)) as pinyin_name
```

**Příklad:**

```
description_short: "**009 – Te Xiao Bi Min Gan Wan** Protáhněte nosní dírky..."
                    ↓
pinyin_name: "Te Xiao Bi Min Gan Wan"
```

### Fuzzy Matching Algoritmus

Kombinuje 3 metriky:

1. **Exact substring match** (váha 90%)
   - "Te Xiao" ⊂ "Te Xiao Bi Min Gan Wan" → 90% shoda

2. **Word overlap** (váha 60%)
   - Kolik slov se shoduje
   - "Te Xiao Wan" vs "Te Xiao Bi Min Gan Wan"
   - Common words: ["Te", "Xiao", "Wan"] = 3/5 = 60%

3. **Levenshtein distance** (váha 40%)
   - Edit distance mezi řetězci
   - "cisty dech" vs "čistý dech" = 2 edits = 90%

**Finální score:**

```javascript
score = wordOverlap * 0.6 + levenshteinSimilarity * 0.4
```

**Threshold:** 50% (produkty pod 50% se ignorují)

### Normalizace textu

Pro srovnání se text normalizuje:

- Lowercase: `"Čistý Dech"` → `"čistý dech"`
- Odstranění diakritiky: `"čistý"` → `"cisty"`
- Odstranění interpunkce: `"Te Xiao – Wan"` → `"Te Xiao Wan"`
- Normalizace mezer: `"Te  Xiao"` → `"Te Xiao"`

## Soubory

### Nové soubory

```
src/services/productNameMatchingService.ts
  └─ Hlavní služba pro matching

create_pinyin_matching_function.sql
  └─ SQL funkce pro načtení produktů s pinyin_name

PRODUCT_NAME_MATCHING_SETUP.md (tento soubor)
  └─ Dokumentace a návod
```

### Upravené soubory

```
src/components/SanaChat/SanaChat.tsx
  └─ Přidán screening + matching při zpracování N8N odpovědi
     (řádky ~320-350)
```

## Konfigurace

### Threshold pro matching

V `productNameMatchingService.ts`, řádek ~56:

```typescript
if (match && match.similarity >= 0.5) { // Threshold pro matching
```

**Doporučení:**
- `0.7` - Přísné (pouze velmi podobné názvy)
- `0.5` - Vyvážené (default)
- `0.3` - Volné (více false positives)

### Screening prompt

Edge function: `supabase/functions/screen-products/index.ts`

Úprava promptu ovlivní, co GPT považuje za produkt.

## Známá omezení

1. **Pouze produkty s pinyin_name**
   - Produkty bez `**text**` na začátku `description_short` se ignorují
   - Řešení: Upravit SQL funkci pro fallback na `product_name`

2. **False positives u obecných termínů**
   - "bolest hlavy" může matchovat produkt s podobným názvem
   - Řešení: Zvýšit threshold nebo vylepšit prompt

3. **Performance při velkém množství produktů**
   - Fuzzy matching je výpočetně náročný
   - Aktuálně: ~150 produktů = OK
   - Nad 1000 produktů: Zvážit indexování nebo caching

## Troubleshooting

### Žádné produkty nalezeny

```
⚠️ Žádné produkty s pinyin_name v databázi
```

**Příčina:** SQL funkce nenašla žádné produkty

**Řešení:**

```sql
-- Zkontroluj produkty
SELECT 
  id, 
  product_name, 
  description_short
FROM product_feed_2 
WHERE description_short ~ '^\*\*[^*]+\*\*'
LIMIT 10;

-- Pokud je prázdné, synchronizuj feed
-- (Správa chatbotu → Produkty → Synchronizovat Feed 2)
```

### Edge Function error

```
❌ Edge Function error: screen-products
```

**Řešení:**

```bash
# Zkontroluj edge function logs
supabase functions logs screen-products

# Re-deploy pokud je potřeba
supabase functions deploy screen-products
```

### Nízká přesnost matchingu

**Řešení:**

1. Sniž threshold (více výsledků, ale méně přesné)
2. Vylepši normalizaci textu
3. Přidej váhu pro číselné kódy (např. "009" má vyšší prioritu)

## Monitoring

### Co sledovat v konzoli

1. **Screening úspěšnost**
   - Kolik produktů GPT identifikuje
   - False positives (např. "dobrý den")

2. **Matching úspěšnost**
   - % nalezených produktů
   - Průměrná shoda (similarity)

3. **Performance**
   - Doba screeningu (~2-5 sec)
   - Doba matchingu (~100-500ms)

### Metriky

```javascript
// V konzoli po každé odpovědi
console.log({
  screeningTime: '3.2s',
  matchingTime: '250ms',
  productsIdentified: 3,
  productsMatched: 2,
  avgSimilarity: 0.85
});
```

## Budoucí vylepšení

1. **Caching produktů**
   - Načíst produkty jednou, cachovat v memory

2. **Index pro rychlé vyhledávání**
   - PostgreSQL full-text search na pinyin_name

3. **Machine learning pro lepší matching**
   - Natrénovat model na historických datech

4. **UI zobrazení nalezených produktů**
   - Místo konzole zobrazit produkty přímo v chatu
   - Inline odkazy na produkty v textu odpovědi

---

**Status:** ✅ Implementováno a testováno
**Datum:** 2025-12-03
**Verze:** 1.0




