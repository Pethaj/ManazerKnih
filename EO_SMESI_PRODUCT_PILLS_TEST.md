# 🧪 EO-Smesi Product Pills - Testovací Guide

## ⚡ Rychlý test (5 minut)

### Krok 1: Otevři EO-Smesi chat

1. Spusť aplikaci
2. Najdi a otevři chatbot **EO-Smesi**
3. Ověř, že je chat prázdný nebo začni novou konverzaci

### Krok 2: Testovací dotazy

#### Test A: Základní produkt (009)

**Dotaz:**
```
bolí mě hlava a mám ucpaný nos
```

**Očekávaná odpověď:**
- Bot zmíní produkt "009" nebo "Te Xiao Bi Min Gan Wan" nebo "Čistý dech"
- Zobrazí se **modrý ProductPill button**: `[🛒 009 - Čistý dech]`

**Ověření:**
- ✅ Button je viditelný
- ✅ Má modrou barvu (gradient)
- ✅ Má ikonu košíku
- ✅ Při hoveru se změní (animace)

#### Test B: Klik na button

**Akce:**
```
Klikni na ProductPill button
```

**Očekávané chování:**
- ✅ Otevře se nový tab
- ✅ URL začína `https://bewit.love/produkt/...`
- ✅ Stránka se načte (produkt existuje)

#### Test C: Vícenásobné produkty

**Dotaz:**
```
potřebuji něco na kašel a únavu
```

**Očekávaná odpověď:**
- Bot zmíní více produktů
- Zobrazí se **více ProductPill buttonů**
- Každý má vlastní název a URL

### Krok 3: Console monitoring

**Otevři Developer Console (F12)**

**Očekávané logy:**

```javascript
// 1. Screening start
🔍 Zahajuji screening a matching produktů z odpovědi...

// 2. Identifikované produkty
📦 GPT identifikoval X produktů: ["009", "Te Xiao Bi Min Gan Wan"]

// 3. Matching
✅ Match: "009" → "009 - Čistý dech" (95%)
   🔗 URL: https://bewit.love/produkt/bewit-cisty-dech

// 4. Shrnutí
📊 SHRNUTÍ MATCHINGU PRODUKTŮ
✅ Nalezeno: 1 produktů
```

## 🔍 Detailní testy

### Test 1: Český název

**Dotaz:**
```
doporučíte mi čistý dech?
```

**Očekáváno:**
- ✅ Matching najde "009 - Čistý dech"
- ✅ ProductPill se zobrazí

### Test 2: Pinyin název

**Dotaz:**
```
máte te xiao bi min gan wan?
```

**Očekáváno:**
- ✅ Fuzzy matching najde produkt přes pinyin_name
- ✅ ProductPill zobrazí: "009 - Čistý dech (Te Xiao Bi Min Gan Wan)"

### Test 3: Číselný kód

**Dotaz:**
```
co je wan 009?
```

**Očekáváno:**
- ✅ Matching na product_code "2347"
- ✅ ProductPill se zobrazí

### Test 4: Varianta názvu

**Dotaz:**
```
cisty dech (bez háčků)
```

**Očekáváno:**
- ✅ Fuzzy matching ignoruje diakritiku
- ✅ Najde "Čistý dech"

### Test 5: Žádný produkt

**Dotaz:**
```
jaké je dnes počasí?
```

**Očekáváno:**
- ✅ Bot odpoví normálně
- ✅ Žádný ProductPill se nezobrazí
- ✅ V console: "GPT identifikoval 0 produktů"

## 🐛 Debugging

### Problém: ProductPill se nezobrazují

**Checklist:**

1. **Ověř nastavení v databázi:**
```sql
SELECT chatbot_id, inline_product_links 
FROM chatbot_settings 
WHERE chatbot_id = 'eo_smesi';
```
Očekávané: `inline_product_links = true`

2. **Ověř SQL funkci:**
```sql
SELECT COUNT(*) FROM get_products_with_pinyin_names();
```
Očekávané: > 0 (má vrátit produkty)

3. **Zkontroluj Console:**
- Hledej chybové zprávy
- Ověř, že screening proběhl
- Zkontroluj, zda matching našel produkty

### Problém: Špatný URL

**Checklist:**

1. **Zkontroluj URL v databázi:**
```sql
SELECT product_code, product_name, url 
FROM product_feed_2 
WHERE product_code = '2347';
```

2. **Ověř marker formát:**
- V Console hledej: `<<<PRODUCT:2347|||URL|||NAME|||PINYIN>>>`
- URL by měl začínat `https://`

### Problém: Nízká přesnost matchingu

**Možné příčiny:**
- GPT screening nezachytil název
- Název v databázi se moc liší od toho v odpovědi
- Pinyin_name není správně extrahován

**Řešení:**
1. Zkontroluj `description_short` v `product_feed_2`
2. Ověř, že obsahuje `**pinyin název**`
3. Upravuj threshold v `productNameMatchingService.ts` (defaultně 0.5)

## 📊 SQL diagnostika

### Ověření dat v databázi

```sql
-- 1. Počet produktů
SELECT COUNT(*) as total_products 
FROM product_feed_2;

-- 2. Produkty s pinyin názvy
SELECT COUNT(*) as products_with_pinyin
FROM get_products_with_pinyin_names();

-- 3. Sample produktů
SELECT 
  product_code,
  product_name,
  pinyin_name,
  url
FROM get_products_with_pinyin_names()
WHERE product_name LIKE '%009%'
LIMIT 5;

-- 4. Chatbot nastavení
SELECT 
  chatbot_id,
  chatbot_name,
  inline_product_links,
  use_feed_1,
  use_feed_2
FROM chatbot_settings
WHERE chatbot_id = 'eo_smesi';
```

## 🎯 Success kritéria

### Minimální test (musí projít):
- ✅ ProductPill se zobrazí při zmínce produktu
- ✅ Klik otevře správný URL
- ✅ Console logy jsou čisté (bez errorů)

### Kompletní test (doporučeno):
- ✅ Český název funguje
- ✅ Pinyin název funguje
- ✅ Číselný kód funguje
- ✅ Fuzzy matching (bez diakritiky) funguje
- ✅ Více produktů se zobrazí správně
- ✅ Dotaz bez produktu nerozbije chat

## 📝 Checklist před nasazením

- [ ] Minimální test prošel
- [ ] Kompletní test prošel
- [ ] Console logy jsou v pořádku
- [ ] URL produktů jsou validní
- [ ] Fuzzy matching má dobrou přesnost
- [ ] Žádné JavaScript errory v Console
- [ ] ProductPill design vypadá správně
- [ ] Hover animace funguje
- [ ] Mobile responsive (pokud potřeba)

## 🆘 Support

**Pokud něco nefunguje:**

1. Zkontroluj všechny body v "Debugging" sekci
2. Pusť SQL diagnostiku
3. Zkontroluj Console logy
4. Ověř, že `inline_product_links = true` v databázi

**Rollback (pokud nutné):**

```sql
UPDATE chatbot_settings
SET inline_product_links = false
WHERE chatbot_id = 'eo_smesi';
```

---

**Happy testing! 🎉**

Pro detaily viz: `EO_SMESI_PRODUCT_PILLS_SETUP.md`
