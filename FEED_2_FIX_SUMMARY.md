# ✅ Souhrn: Oprava HTML entit v Product Feed 2

## 🎯 Problém

**Popis:**
Produkty z Feed 2 se do Supabase propisovaly s HTML entitami místo správných znaků.

**Příklad:**
- **Produkt:** 2233
- **Ve feedu:** `001 - Rozptýlení větru`
- **V databázi:** `001 - Rozpt&#xFD;len&#xED; v&#x11B;tru` ❌

## 🔍 Příčina

XML parser `fast-xml-parser` měl zapnuté automatické parsování hodnot:
- `parseTagValue: true`
- `parseAttributeValue: true`
- Výchozí nastavení pro HTML entities

To způsobovalo, že HTML entity nebyly správně dekódovány.

## ✅ Řešení

### 1. Přidána funkce `decodeHtmlEntities()`

```typescript
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
```

### 2. Aktualizována funkce `toStr()`

```typescript
function toStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return decodeHtmlEntities(s);  // ← Přidáno dekódování
}
```

### 3. Upravena konfigurace XML parseru

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,        // ← Vypnuto
  parseAttributeValue: false,  // ← Vypnuto
  trimValues: true,
  processEntities: false,      // ← Přidáno
  htmlEntities: false          // ← Přidáno
});
```

## 🧪 Testování

**Vytvořen test:** `test_html_entities_decode.ts`

```bash
npx tsx test_html_entities_decode.ts
```

**Výsledek:** ✅ Všechny testy prošly (8/8)

**Testované případy:**
1. ✅ Hexadecimální entity (&#xFD; → ý)
2. ✅ Decimální entity (&#253; → ý)
3. ✅ Pojmenované entity (&quot;, &amp;, etc.)
4. ✅ Komplexní český text
5. ✅ Pangram s diakritikou
6. ✅ Text bez entit
7. ✅ Prázdný řetězec

## 📦 Změněné soubory

```
✅ supabase/functions/sync-feed-2/index.ts
   - Přidána funkce decodeHtmlEntities()
   - Aktualizována funkce toStr()
   - Upravena konfigurace XML parseru

📄 test_html_entities_decode.ts
   - Nový test pro ověření dekódování

📄 FEED_2_HTML_ENTITIES_FIX.md
   - Detailní dokumentace opravy

📄 clean_feed_2_and_resync.sql
   - SQL skript pro vyčištění a resynchronizaci

📄 DEPLOY_FEED_2_FIX.md
   - Deployment guide

📄 deploy_feed_2_fix.sh
   - Bash skript pro automatický deployment

📄 FEED_2_FIX_SUMMARY.md
   - Tento souhrn
```

## 🚀 Deployment

### Rychlé nasazení

```bash
# Spusťte připravený skript
./deploy_feed_2_fix.sh
```

### Nebo manuálně

```bash
# 1. Deploy Edge Function
npx supabase functions deploy sync-feed-2

# 2. Vyčistit data (SQL v Supabase)
DELETE FROM product_embeddings WHERE feed_source = 'feed_2';
DELETE FROM product_feed_2;

# 3. Spustit synchronizaci
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/sync-feed-2" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## ✅ Ověření

### 1. Kontrola produktu 2233

```sql
SELECT product_code, product_name 
FROM product_feed_2 
WHERE product_code = '2233';
```

**Očekávaný výsledek:**
```
product_code | product_name
-------------+-------------------------
2233         | 001 - Rozptýlení větru
```

✅ **SPRÁVNĚ** (české znaky)

### 2. Kontrola HTML entit

```sql
SELECT COUNT(*) 
FROM product_feed_2 
WHERE product_name LIKE '%&#%';
```

**Očekávaný výsledek:** `0`

### 3. Kontrola celkového stavu

```sql
SELECT 
  COUNT(*) as celkem,
  COUNT(*) FILTER (WHERE sync_status = 'success') as uspesne
FROM product_feed_2;
```

## 🎉 Výsledek

Po nasazení opravy:

✅ Produkt 2233: `001 - Rozptýlení větru`  
✅ Všechny české znaky správně  
✅ Žádné HTML entity v databázi  
✅ Testy: 8/8 úspěšných  
✅ Připraveno k produkci

## 📚 Dokumentace

Pro detailní informace viz:
- `FEED_2_HTML_ENTITIES_FIX.md` - Technická dokumentace
- `DEPLOY_FEED_2_FIX.md` - Deployment guide
- `clean_feed_2_and_resync.sql` - SQL skripty

## 🔄 Následující kroky

1. ✅ Oprava implementována
2. ✅ Testy napsány a prošly
3. ✅ Dokumentace vytvořena
4. 🔄 **NEXT:** Deploy do produkce
5. 🔄 **NEXT:** Ověření v produkční databázi
6. 🔄 **NEXT:** Test vyhledávání v chatbotu

---

**Status:** ✅ Připraveno k nasazení  
**Datum:** 25.11.2024  
**Otestováno:** ✅ Ano (8/8 testů prošlo)

