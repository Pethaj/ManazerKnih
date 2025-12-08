# Debug Guide - Inline Produktové Linky

## 🔍 Rychlá Diagnostika

Pokud se inline produktové linky nezobrazují, následuj tyto kroky:

### 1. Ověř SQL migraci

```sql
-- Spusť v Supabase SQL Editor
\i verify_inline_links.sql
```

Měl bys vidět:
- Sloupec `inline_product_links` existuje
- Data type: `boolean`
- Default: `false`

### 2. Aktivuj funkci v nastavení

1. Otevři aplikaci: http://localhost:5176
2. Přihlas se jako admin
3. **Správa chatbotů** → Vyber svůj chatbot
4. Sekce "Základní funkce"
5. ☑️ Zaklikni **"Inline produktové linky"**
6. **Uložit změny**

### 3. Ověř v databázi

```sql
-- Ověř že je zapnuté pro tvůj chatbot
SELECT 
    chatbot_id,
    chatbot_name,
    inline_product_links,
    is_active
FROM chatbot_settings
WHERE chatbot_id = 'TVUJ_CHATBOT_ID';
```

Mělo by být: `inline_product_links = true`

### 4. Zkontroluj konzoli prohlížeče

Otevři chat a zadej dotaz. V konzoli (F12) hledej:

**✅ SPRÁVNÉ LOGY:**
```javascript
🔍 Inline Links - useEffect trigger: {
  isUser: false,
  inline_product_links: true,  // ← MUSÍ BÝT TRUE
  hasText: true,
  textLength: 245
}

🔍 ✅ SPOUŠTÍM detekci inline produktů...
📝 Text zprávy: "Pro bolest hlavy doporučuji..."
📝 Extrakce zmínek produktů z textu...
📋 Nalezeno 3 vět k analýze
🔍 Vektorové vyhledávání produktů...
✅ Nalezen produkt: 009 - Čistý dech (similarity: 0.85)
🎉 Detekce dokončena: 1 produktů s URL
```

**❌ PROBLÉMOVÉ LOGY:**
```javascript
⚠️ Detekce NESPUŠTĚNA - podmínky: {
  isUser: false,
  inline_product_links: false,  // ← PROBLÉM!
  hasText: true
}
```

## 🐛 Časté Problémy

### Problém 1: `inline_product_links` je `undefined` nebo `false`

**Příčina:** Nastavení se nenačetlo z databáze

**Řešení:**
1. Refresh stránky (Ctrl+R)
2. Zkontroluj v konzoli: `fullSettings` objekt
3. Měl by obsahovat `inline_product_links: true`

### Problém 2: Detekce se spustí ale nenajde produkty

**Logy:**
```javascript
✅ Detekováno 0 produktů
```

**Příčiny:**
- Embeddings služba vrací mock data (prázdné vektory)
- Produkty nejsou v `product_embeddings` s `feed_source = 'feed_2'`
- Similarity threshold je moc vysoký (0.7)

**Řešení:**
```sql
-- Ověř že máš embeddings
SELECT COUNT(*) 
FROM product_embeddings 
WHERE feed_source = 'feed_2' 
AND embedding_status = 'completed';

-- Mělo by být > 0
```

### Problém 3: Produkty nalezeny ale bez URL

**Logy:**
```javascript
⚠️ Produkty nenalezeny v Feed 2
```

**Řešení:**
```sql
-- Ověř že produkty mají URL
SELECT product_code, product_name, url 
FROM product_feed_2 
WHERE url IS NOT NULL 
LIMIT 10;
```

## 🔧 Rychlé Opravy

### Oprava 1: Reset nastavení chatbota

```sql
-- Nastav inline_product_links na true pro tvůj chatbot
UPDATE chatbot_settings
SET inline_product_links = true
WHERE chatbot_id = 'TVUJ_CHATBOT_ID';
```

### Oprava 2: Test s jednoduchým produktem

```sql
-- Najdi produkt který určitě existuje
SELECT 
    product_code, 
    product_name, 
    url 
FROM product_feed_2 
WHERE product_name LIKE '%Čistý dech%'
LIMIT 1;
```

Pak v chatu zkus: "Co je 009 - Čistý dech?"

### Oprava 3: Zkontroluj FilteredSanaChatWithSettings

V konzoli hledej:
```javascript
🤖 Načítám nastavení pro chatbota: your_chatbot_id
📊 Načtené filtrace pro chatbota: { ... }
```

Objekt by měl obsahovat: `inlineProductLinks: true`

## 📊 Monitoring

### Základní check:

```sql
-- Kompletní přehled
SELECT 
    cs.chatbot_id,
    cs.chatbot_name,
    cs.inline_product_links,
    COUNT(DISTINCT pe.id) as embeddings_count,
    COUNT(DISTINCT pf.product_code) as feed2_products_count
FROM chatbot_settings cs
LEFT JOIN product_embeddings pe ON pe.feed_source = 'feed_2'
LEFT JOIN product_feed_2 pf ON pf.url IS NOT NULL
WHERE cs.chatbot_id = 'TVUJ_CHATBOT_ID'
GROUP BY cs.chatbot_id, cs.chatbot_name, cs.inline_product_links;
```

## ✅ Checklist

- [ ] SQL migrace spuštěna
- [ ] Sloupec `inline_product_links` existuje v DB
- [ ] Checkbox zakliknutý v UI nastavení
- [ ] `inline_product_links = true` v databázi
- [ ] Refresh stránky po změně nastavení
- [ ] Konzole ukazuje správné logy
- [ ] Embeddings existují pro feed_2
- [ ] Produkty v feed_2 mají URL
- [ ] Test dotaz: "Co je 009 - Čistý dech?"

## 🆘 Stále nefunguje?

1. **Hard refresh:** Ctrl+Shift+R
2. **Clear cache:** Smaž browser cache
3. **Zkontroluj verzi:** Je aplikace aktuální? `npm run dev`
4. **Logy:** Pošli všechny logy z konzole
5. **Database check:** Výsledky `verify_inline_links.sql`

---

**Důležité:** Mock embedding service zatím vrací prázdné vektory! Pro produkci implementuj skutečné volání OpenAI API.




