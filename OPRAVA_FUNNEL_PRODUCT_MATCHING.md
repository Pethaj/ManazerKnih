# Oprava Product Matching ve Funnel (Úzký výběr)

## 🐛 Problém

Při použití funkce "úzký výběr" v produktovém funnelu (Wany Chat) se do dlazdic nahrál **špatný produkt** z `product_feed_2`.

### Symptomy
- Uživatel dostane doporučení s inline product pills (markery `<<<PRODUCT:...>>>`)
- Po kliknutí na callout tlačítko se zobrazí funnel s 2 produktovými dlaždicemi
- **PROBLÉM:** Dlaždice zobrazí jiný produkt, než byl v inline pills!

### Příčina

V souboru `src/services/intentRoutingService.ts` funkce `enrichFunnelProductsFromDatabase()` hledala produkty v databázi **pouze podle `product_code`**:

```typescript
// ❌ PŮVODNÍ KÓD (ŠPATNĚ)
const dbData = data.find(d => d.product_code === product.product_code);
```

**Proč to bylo špatně:**

1. `product_code` v tabulce `product_feed_2` **NENÍ unikátní identifikátor**
2. Při parsování markerů `<<<PRODUCT:code|||url|||name|||pinyin>>>` se extrahoval pouze `code`
3. V databázi může být **více produktů se stejným nebo podobným kódem**
4. Funkce `.find()` vrátila **první nalezený produkt**, který nebyl správný

**Příklad chybného párování:**
```
Marker: <<<PRODUCT:2347|||https://bewit.love/produkt/009-cisty-dech|||009 - Čistý dech|||...>>>
                     ^^^^                         ^^^^^^^^^^^^^^^^^^^^^
                     code                         SPRÁVNÝ produkt (URL!)

Hledání v DB: 
  SELECT * FROM product_feed_2 WHERE product_code = '2347'
  
Výsledek:
  ❌ Vrátil PRVNÍ produkt s kódem 2347
  ✅ Měl vrátit produkt s URL "https://bewit.love/produkt/009-cisty-dech"
```

## ✅ Řešení

### Změna 1: Prioritizace URL matching v `enrichFunnelProductsFromDatabase()`

Upravena logika párování produktů - **prioritizuje URL před product_code**:

```typescript
// ✅ NOVÝ KÓD (SPRÁVNĚ)
// 1. Priorita: Matching podle URL (URL je unikátní!)
let dbData = null;
if (product.url) {
  dbData = data.find(d => d.url === product.url);
  if (dbData) {
    console.log(`   ✅ Nalezeno podle URL: ${dbData.product_name}`);
  }
}

// 2. Fallback: Matching podle product_code
if (!dbData) {
  dbData = data.find(d => d.product_code === product.product_code);
  if (dbData) {
    console.log(`   ✅ Nalezeno podle product_code: ${dbData.product_name}`);
  }
}
```

**Proč to funguje:**
- URL je **unikátní identifikátor** v `product_feed_2`
- Marker obsahuje **kompletní URL** produktu z inline pills
- Párování podle URL zajistí **100% shodu** se správným produktem

### Změna 2: Rozšíření databázového dotazu

Upravena SQL query, aby načítala produkty **podle URL nebo product_code**:

```typescript
// ✅ Sestavíme OR podmínku pro URL nebo product_code
const orConditions: string[] = [];

if (productUrls.length > 0) {
  orConditions.push(`url.in.(${productUrls.map(url => `"${url}"`).join(',')})`);
}

if (productCodes.length > 0) {
  orConditions.push(`product_code.in.(${productCodes.map(code => `"${code}"`).join(',')})`);
}

if (orConditions.length > 0) {
  query = query.or(orConditions.join(','));
}
```

**Výhoda:**
- Jeden SQL dotaz načte všechny produkty podle URL **nebo** product_code
- Rychlejší než samostatné dotazy
- Fallback pro případy, kdy URL chybí

### Změna 3: Oprava fallback funkce `enrichByProductName()`

Upravena také fallback funkce, aby **preferovala URL matching**:

```typescript
// 1. PRIORITA: Hledání podle URL (nejpřesnější!)
if (product.url) {
  const urlResult = await supabase
    .from('product_feed_2')
    .select('...')
    .eq('url', product.url)
    .single();
  
  if (!urlResult.error && urlResult.data) {
    console.log(`   ✅ Nalezeno podle URL: ${urlResult.data.product_name}`);
    data = urlResult.data;
  }
}

// 2. FALLBACK: Hledání podle názvu (pokud URL selhalo)
if (!data) {
  // ... hledání podle názvu
}
```

## 📊 Datový tok (OPRAVENO)

### Před opravou ❌
```
1. Uživatel vidí inline pills → <<<PRODUCT:2347|||url|||009 - Čistý dech|||...>>>
2. Uživatel klikne na callout
3. extractProductsFromHistory() parsuje marker:
   - product_code: "2347" ✅
   - url: "https://bewit.love/produkt/009-cisty-dech" ✅
   - product_name: "009 - Čistý dech" ✅
4. enrichFunnelProductsFromDatabase():
   - Dotaz: WHERE product_code = '2347'
   - ❌ Vrátí PRVNÍ produkt s kódem 2347 (ŠPATNÝ!)
5. Dlaždice zobrazí ŠPATNÝ produkt
```

### Po opravě ✅
```
1. Uživatel vidí inline pills → <<<PRODUCT:2347|||url|||009 - Čistý dech|||...>>>
2. Uživatel klikne na callout
3. extractProductsFromHistory() parsuje marker:
   - product_code: "2347" ✅
   - url: "https://bewit.love/produkt/009-cisty-dech" ✅
   - product_name: "009 - Čistý dech" ✅
4. enrichFunnelProductsFromDatabase():
   - Dotaz: WHERE url = '...' OR product_code = '2347'
   - Načtení všech kandidátů
   - ✅ Prioritní matching podle URL
   - ✅ Vrátí SPRÁVNÝ produkt (podle URL)
5. Dlaždice zobrazí SPRÁVNÝ produkt ✅
```

## 🧪 Testování

### Manuální test
1. Otevři chatbot (Sana 2 / Wany Chat)
2. Zadej dotaz s více symptomy (např. "bolest hlavy, rýma, kašel")
3. Bot vrátí odpověď s inline product pills (modré tlačítka)
4. Klikni na callout tlačítko "Potřebujete přesnější doporučení?"
5. Zadej dodatečné symptomy (např. "únava")
6. Bot vrátí funnel se 2 produktovými dlaždicemi
7. **Ověř:** Produkty v dlaždicích odpovídají těm z inline pills

### Kontrolní SQL dotazy

```sql
-- 1. Ověř, že URL jsou unikátní v product_feed_2
SELECT url, COUNT(*) 
FROM product_feed_2 
WHERE url IS NOT NULL 
GROUP BY url 
HAVING COUNT(*) > 1;
-- Očekávaný výsledek: 0 řádků (URL jsou unikátní)

-- 2. Zkontroluj produkty s duplicitními product_code
SELECT product_code, COUNT(*), 
       STRING_AGG(product_name, ' | ') as names
FROM product_feed_2 
GROUP BY product_code 
HAVING COUNT(*) > 1;
-- Toto může vrátit duplicity - proto je důležité párování podle URL!

-- 3. Ověř konkrétní produkt podle URL
SELECT product_code, product_name, url, thumbnail
FROM product_feed_2
WHERE url = 'https://bewit.love/produkt/009-cisty-dech';
-- Musí vrátit PŘESNĚ JEDEN produkt
```

### Console log diagnostika

Po opravě uvidíš v konzoli:
```
🔍 Hledám produkt: 009 - Čistý dech
   product_code: 2347
   url: https://bewit.love/produkt/009-cisty-dech
✅ Nalezeno podle URL: 009 - Čistý dech
   → thumbnail: ANO
   → price: 175
```

Před opravou (špatně):
```
✅ 009 - Čistý dech → thumbnail: ANO
[ale vrátil jiný produkt s kódem 2347!]
```

## 📝 Soubory upravené

- `src/services/intentRoutingService.ts`
  - `enrichFunnelProductsFromDatabase()` - řádky 418-520
  - `enrichByProductName()` - řádky 522-591

## 🔍 Related Issues

- Inline product pills fungují správně (obsahují správné URL)
- Problem je POUZE v párování při funnelu
- N8N webhook vrací správné markery
- Parsování markerů v `extractProductsFromHistory()` funguje správně

## ✅ Výsledek

- ✅ Produkty se párují podle **URL jako prioritního identifikátoru**
- ✅ Fallback na `product_code` pokud URL chybí
- ✅ Dlaždice ve funnelu zobrazí **správné produkty**
- ✅ Konzistence mezi inline pills a funnel dlaždicemi
- ✅ Žádné změny v databázovém schématu potřeba

## 🚀 Deployment

Oprava je **client-side only** (TypeScript frontend):
- Není nutné migrovat databázi
- Není nutné aktualizovat Edge Functions
- Stačí deployment nové verze frontend aplikace

```bash
npm run build
# Deploy dist/ folder
```

---

**Datum opravy:** 2024-12-09  
**Status:** ✅ Opraveno a otestováno  
**Dopad na CORE:** Nízký (oprava chyby v existující funkci)







