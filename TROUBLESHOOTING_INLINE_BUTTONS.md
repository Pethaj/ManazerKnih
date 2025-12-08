žýáíéú)¨úpoiuztrewsqa asdfghjklů§
_.<m nbcx# 🔧 Troubleshooting - Inline Product Buttons

## ❌ Problém: Tlačítka se nezobrazují v chatu

Pokud se produktová tlačítka nezobrazují v chatbot odpovědích, následuj tento postup.

---

## 📋 Krok 1: Zkontroluj Console Log

1. Otevři chat a polož otázku (např. "Co je to wan 009?")
2. Otevři Developer Console (F12 nebo Cmd+Option+I)
3. Přejdi na záložku "Console"
4. Hledej tento výpis:

```
═══════════════════════════════════════════════════════════
🔍 INLINE PRODUCT BUTTONS - DIAGNOSTIKA
═══════════════════════════════════════════════════════════
```

### ✅ Co by mělo být v logu:

```
═══════════════════════════════════════════════════════════
🔍 INLINE PRODUCT BUTTONS - DIAGNOSTIKA
═══════════════════════════════════════════════════════════
📝 Text délka: 450 znaků
📄 Text preview: Pro nosní průchodnost doporučuji...
═══════════════════════════════════════════════════════════
✅ Služby úspěšně importovány
🔍 Zahajuji screening produktů z odpovědi...
📊 Screening výsledek: { success: true, productCount: 2, products: ["wan 009", "Čistý dech"] }
📦 GPT identifikoval 2 produktů/témat: ["wan 009", "Čistý dech"]
🔍 Zahajuji matching v databázi...
📊 Matching výsledek: { success: true, matchCount: 1, unmatchedCount: 1 }
✅ Nalezeno 1 produktů v databázi
📦 Matched produkty: [{ matched_from: "wan 009", product_name: "009 - Čistý dech", ... }]
🔍 Vkládám produktové tlačítka přímo do textu...
  🔎 Hledám "wan 009" v textu...
    ✅ Marker vložen hned za "wan 009" na pozici 45
✅ Produktové tlačítka vložena do textu
📝 Finální text s markery (preview): Pro nosní průchodnost doporučuji wan 009 <<<PRODUCT:...
═══════════════════════════════════════════════════════════
```

---

## 🔍 Krok 2: Identifikuj problém

### ❌ Chyba: "Edge Function chyba"

```
❌ CHYBA při screeningu/matchingu produktů:
📊 Detaily chyby: { message: "Edge Function chyba: screen-products" }
```

**Příčina:** Edge Function `screen-products` není nasazená nebo nemá API klíč.

**Řešení:**

1. Otevři Supabase Dashboard
2. Přejdi na **Edge Functions**
3. Zkontroluj, že existuje funkce `screen-products`
4. Pokud neexistuje, nasaď ji:

```bash
cd supabase/functions
supabase functions deploy screen-products
```

5. Zkontroluj, že je nastaven `OPENROUTER_API_KEY` secret:

```bash
supabase secrets list
```

Pokud chybí:

```bash
supabase secrets set OPENROUTER_API_KEY=your_api_key_here
```

---

### ❌ Chyba: "Database error: function get_products_with_pinyin_names() does not exist"

```
❌ CHYBA při screeningu/matchingu produktů:
📊 Detaily chyby: { message: "Database error: function get_products_with_pinyin_names() does not exist" }
```

**Příčina:** SQL funkce pro matching produktů neexistuje v databázi.

**Řešení:**

1. Otevři Supabase Dashboard
2. Přejdi na **SQL Editor**
3. Spusť tento SQL:

```sql
-- Vytvoření funkce pro matching produktů
CREATE OR REPLACE FUNCTION public.get_products_with_pinyin_names()
RETURNS TABLE (
  id BIGINT,
  product_code VARCHAR,
  product_name VARCHAR,
  description_short TEXT,
  pinyin_name TEXT,
  url TEXT
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
  FROM public.product_feed_2 pf2
  WHERE pf2.description_short ~ '^\*\*[^*]+\*\*'
    AND pf2.url IS NOT NULL
  ORDER BY pf2.id;
END;
$$ LANGUAGE plpgsql;

-- Oprávnění
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO authenticated;
```

4. Zkontroluj, že funkce funguje:

```sql
SELECT * FROM get_products_with_pinyin_names() LIMIT 10;
```

Mělo by vrátit produkty s pinyin názvy.

---

### ⚠️ Varování: "GPT neidentifikoval žádné produkty"

```
ℹ️ GPT neidentifikoval žádné produkty v odpovědi
💡 TIP: Zkus se zeptat na konkrétní produkt nebo čínský název
```

**Příčina:** GPT model neidentifikoval žádné produkty v textu odpovědi.

**Řešení:**

- Ptej se specifičtěji (např. místo "Mám rýmu" zkus "Jaký wan pomůže na rýmu?")
- Zmiň konkrétní produkty nebo čísla (např. "009")
- Používej čínské názvy (např. "Te Xiao Bi Min Gan Wan")

---

### ⚠️ Varování: "Žádné produkty nebyly namatchovány v databázi"

```
⚠️ Žádné produkty nebyly namatchovány v databázi
```

**Příčina:** GPT identifikoval produkty, ale nebyly nalezeny v `product_feed_2`.

**Možné důvody:**

1. **Produkt není v databázi:**
   - Zkontroluj, že produkt existuje v tabulce `product_feed_2`
   - Spusť: `SELECT * FROM product_feed_2 WHERE product_name ILIKE '%čistý dech%';`

2. **Chybí pinyin název:**
   - Produkt musí mít `description_short` ve formátu `**Pinyin Name** ...`
   - Zkontroluj: `SELECT product_code, product_name, description_short FROM product_feed_2 WHERE product_code = '009';`

3. **Fuzzy matching je příliš přísný:**
   - Defaultní threshold je 50% shoda
   - Můžeš snížit v `src/services/productNameMatchingService.ts` (řádek cca 90)

---

## 📊 Krok 3: Test v izolaci

Pokud stále nejde, vyzkoušej test funkcí samostatně:

### Test Edge Function

```javascript
// V browser console
const { data, error } = await supabase.functions.invoke('screen-products', {
  body: { text: 'Doporučuji wan 009 - Čistý dech na rýmu.' }
});
console.log('Screening result:', data);
```

**Očekávaný výstup:**
```javascript
{
  success: true,
  products: ["wan 009", "Čistý dech", "rýma"]
}
```

### Test SQL Function

```javascript
// V browser console
const { data, error } = await supabase.rpc('get_products_with_pinyin_names');
console.log('Products:', data?.length, 'nalezeno');
console.log('První 5:', data?.slice(0, 5));
```

**Očekávaný výstup:**
```javascript
Products: 142 nalezeno
První 5: [
  { product_code: "009", product_name: "009 - Čistý dech", pinyin_name: "Te Xiao Bi Min Gan Wan", ... },
  ...
]
```

---

## ✅ Checklist

Před tím, než kontaktuješ support, zkontroluj:

- [ ] Edge Function `screen-products` je nasazená a má API klíč
- [ ] SQL funkce `get_products_with_pinyin_names()` existuje
- [ ] Tabulka `product_feed_2` obsahuje produkty
- [ ] Produkty v `product_feed_2` mají `description_short` s pinyin názvy
- [ ] Console log ukazuje diagnostiku (zelený header s `═══`)
- [ ] Ptáš se na konkrétní produkty (ne obecné otázky)

---

## 💡 Rychlé opravy

### 1. Restart Edge Function

```bash
supabase functions deploy screen-products --no-verify-jwt
```

### 2. Refresh RPC permissions

```sql
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO anon;
GRANT EXECUTE ON FUNCTION public.get_products_with_pinyin_names() TO authenticated;
```

### 3. Test konkrétního produktu

V chatu zkus:
- "Řekni mi o wan 009"
- "Co je Te Xiao Bi Min Gan Wan?"
- "Jaký produkt pomůže na rýmu?"

---

## 📞 Stále nefunguje?

1. **Zkopíruj celý console log** (všechno mezi `═══`)
2. **Pošli screenshot console** s chybou
3. **Napiš, jakou otázku jsi pokládal** v chatu

To mi pomůže rychle identifikovat problém.

---

**Poslední update:** 2025-12-04
**Verze diagnostiky:** 2.0



