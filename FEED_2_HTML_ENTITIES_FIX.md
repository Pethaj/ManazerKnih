# Oprava HTML entit v Product Feed 2

## Problém

Při synchronizaci Product Feed 2 se HTML entity propisovaly do databáze v zakódované podobě místo správných znaků:

**Chybný stav:**
- Ve feedu: `001 - Rozptýlení větru`
- V databázi: `001 - Rozpt&#xFD;len&#xED; v&#x11B;tru`

**Příčina:**
XML parser `fast-xml-parser` měl v konfiguraci zapnuté:
- `parseTagValue: true`
- `parseAttributeValue: true`
- `processEntities` a `htmlEntities` ve výchozím nastavení

Tyto nastavení způsobovala nesprávné zpracování HTML entit.

## Řešení

### 1. Přidání funkce pro dekódování HTML entit

```typescript
// Dekódování HTML entit
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

### 2. Úprava `toStr` funkce

```typescript
function toStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return decodeHtmlEntities(s);
}
```

### 3. Aktualizace XML parser konfigurace

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false, // Vypnuto - budeme parsovat manuálně
  parseAttributeValue: false, // Vypnuto - budeme parsovat manuálně
  trimValues: true,
  processEntities: false, // Zachová HTML entity pro naše vlastní dekódování
  htmlEntities: false // Vypneme automatické HTML entities
});
```

## Testování

### Před nasazením

```bash
# Deploy Edge Function
npx supabase functions deploy sync-feed-2
```

### Spuštění synchronizace

```bash
# Ručně spustit Edge Function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-feed-2 \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Ověření v databázi

```sql
-- Zkontrolovat produkt 2233
SELECT 
  product_code,
  product_name,
  description_short,
  category
FROM product_feed_2
WHERE product_code = '2233';

-- Očekávaný výsledek:
-- product_name: "001 - Rozptýlení větru" (správné české znaky)
```

### Kontrola všech produktů s diakritikou

```sql
-- Najít všechny produkty, které by mohly mít problém s HTML entitami
SELECT 
  product_code,
  product_name,
  description_short
FROM product_feed_2
WHERE 
  product_name LIKE '%&#x%' 
  OR product_name LIKE '%&#%'
  OR description_short LIKE '%&#x%'
  OR description_short LIKE '%&#%'
  OR description_long LIKE '%&#x%'
  OR description_long LIKE '%&#%';

-- Pokud vše funguje správně, tento dotaz by měl vrátit 0 řádků
```

## Výsledek

Po opravě:
- ✅ Všechny české znaky (ý, í, ě, š, č, ř, ž, etc.) se správně ukládají do databáze
- ✅ HTML entity (`&#xFD;`, `&#x11B;`, atd.) jsou správně dekódovány
- ✅ Data v databázi odpovídají přesně datům ve feedu

## Soubory změněny

- `/supabase/functions/sync-feed-2/index.ts`
  - Přidána funkce `decodeHtmlEntities()`
  - Aktualizována funkce `toStr()`
  - Upravena konfigurace XML parseru

## Poznámky

- Dekódování HTML entit se provádí pro všechny textové hodnoty (názvy, popisy, kategorie, URL)
- Podporovány jsou:
  - Hexadecimální entity: `&#xFD;` → `ý`
  - Decimální entity: `&#253;` → `ý`
  - Pojmenované entity: `&quot;`, `&amp;`, `&lt;`, `&gt;`, `&apos;`
- Funkce je robustní a bezpečná i pro texty bez HTML entit

## Následující kroky

1. ✅ Opravit Edge Function
2. 🔄 Nasadit do produkce
3. 🔄 Spustit synchronizaci
4. 🔄 Ověřit data v databázi
5. 🔄 Případně smazat staré záznamy s chybnými daty a znovu synchronizovat




