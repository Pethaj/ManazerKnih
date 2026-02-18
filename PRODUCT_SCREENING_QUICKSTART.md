# 🚀 Quickstart: Testování Product Screening Orchestration

## 📋 Co bylo implementováno

Do `inlineProductScreeningService.ts` byla přidána nová funkce **`screenProductsWithPairing()`**, která orchestruje:

1. ⚡ **Problem Classification** - Identifikuje problém z user zprávy (paralelně)
2. ⚡ **Product Extraction** - Extrahuje produkty z bot odpovědi (paralelně)
3. 🔍 **Product Code Lookup** - Najde product_code v databázi
4. 🔗 **Product Pairing** - Napáruje kombinace podle tabulky `leceni`

## 🧪 Jak to otestovat

### Varianta 1: Node.js Test Script (Doporučeno)

```bash
# Ujisti se, že máš .env.local s Supabase credentials
node test-screening-with-pairing.js
```

**Očekávaný výstup:**
```
🧪 TEST: Product Screening s Problem Classification a Pairing
======================================================================

📥 USER MESSAGE:
Bolí mě hlava ze stresu a jsem přepracovaný

📥 BOT RESPONSE:
Doporučuji vám LEVANDULE esenciální olej pro uklidnění a KADIDLO pro meditaci.
    Můžete také zkusit směs RELAX nebo NOPA pro podporu nervového systému.
    PRAWTEIN Aloe Vera Plus může pomoct s regenerací.

======================================================================

⚡ KROK 1: PARALLEL - Problem Classification + Product Extraction
----------------------------------------------------------------------
🔍 Problem Classification...
📥 User message: Bolí mě hlava ze stresu a jsem přepracovaný
...
✅ Klasifikované problémy: [ 'Bolest hlavy – ze stresu' ]

🔍 Product Extraction...
...
✅ Extrahované produkty: [ 'LEVANDULE', 'KADIDLO', 'RELAX', 'NOPA', 'PRAWTEIN Aloe Vera Plus' ]

----------------------------------------------------------------------

🔍 KROK 2: VALIDACE
----------------------------------------------------------------------
Problémy identifikovány: ✅ [ 'Bolest hlavy – ze stresu' ]
Produkty extrahovány: ✅ [ 'LEVANDULE', 'KADIDLO', 'RELAX', 'NOPA', 'PRAWTEIN Aloe Vera Plus' ]

----------------------------------------------------------------------

🔍 KROK 3: PRODUCT CODE LOOKUP
----------------------------------------------------------------------
🔍 Hledám product_code pro názvy: [ 'LEVANDULE', 'KADIDLO', ... ]
   ✅ Match: "LEVANDULE" → 2345 (LEVANDULE esenciální olej)
   ✅ Match: "KADIDLO" → 2346 (BEWIT KADIDLO esenciální olej)
...
Nalezené product_code: [ '2345', '2346', ... ]

----------------------------------------------------------------------

🔗 KROK 4: PRODUCT PAIRING
----------------------------------------------------------------------
🔗 Product Pairing Service...
📥 Product codes: [ '2345', '2346', ... ]
✅ Napárováno produktů: 2
   - PRAWTEIN Frankincense Plus (Prawtein)
   - 004 - Eliminace větru (TČM - Tradiční čínská medicína)

----------------------------------------------------------------------

🎉 VÝSLEDEK:
======================================================================

✅ Identifikované problémy: [ 'Bolest hlavy – ze stresu' ]
✅ Extrahované produkty: [ 'LEVANDULE', 'KADIDLO', ... ]
✅ Nalezené product_code: [ '2345', '2346', ... ]

🔗 NAPÁROVANÉ PRODUKTY: 2
   - PRAWTEIN Frankincense Plus (Prawtein)
   - 004 - Eliminace větru (TČM - Tradiční čínská medicína)

💧 Aloe doporučeno: ✅ ANO
✨ Merkaba doporučeno: ❌ NE

======================================================================
```

### Varianta 2: TypeScript/Frontend Test

```typescript
// V konzoli prohlížeče (DevTools)
import { testProductScreeningWithPairing } from './services/inlineProductScreeningService';

await testProductScreeningWithPairing();
```

### Varianta 3: Vlastní test

```typescript
import { screenProductsWithPairing } from './services/inlineProductScreeningService';

const result = await screenProductsWithPairing(
  "Bolí mě hlava",  // User message
  "Doporučuji LEVANDULE a KADIDLO esenciální oleje.",  // Bot response
  true  // enablePairing
);

console.log('Problémy:', result.problems);
console.log('Produkty:', result.extractedProducts);
console.log('Napárované:', result.pairedProducts);
console.log('Aloe:', result.aloeRecommended);
console.log('Merkaba:', result.merkabaRecommended);
```

## 🔧 Příprava testovacích dat

### 1. Zkontroluj tabulku `leceni`

```sql
-- Zkontroluj dostupné problémy
SELECT DISTINCT "Problém" FROM leceni ORDER BY "Problém";

-- Mělo by vrátit např.:
-- "Bolest hlavy – ze stresu"
-- "Bolest hlavy – nervová"
-- "Migréna"
-- atd.
```

### 2. Zkontroluj `product_feed_2`

```sql
-- Zkontroluj produkty pro matching
SELECT product_code, product_name 
FROM product_feed_2 
WHERE LOWER(product_name) LIKE '%levandule%'
   OR LOWER(product_name) LIKE '%kadidlo%'
   OR LOWER(product_name) LIKE '%nopa%';

-- Mělo by vrátit produkty s kódy (např. 2345, 2346, 1234)
```

### 3. Test SQL párovací funkce

```sql
-- Test párování s konkrétními product_code
SELECT * FROM match_product_combinations(
  ARRAY['NOHEPA', 'BESTFRIEND']::TEXT[]
);

-- Mělo by vrátit napárované produkty z tabulky leceni
```

## 📊 Struktura výsledku

```typescript
interface ProductScreeningWithPairingResult {
  success: boolean;                // ✅ true pokud vše proběhlo
  
  // Krok 1: Problem Classification
  problems: string[];              // ["Bolest hlavy – ze stresu"]
  
  // Krok 2: Product Extraction
  extractedProducts: string[];     // ["LEVANDULE", "KADIDLO", "NOPA"]
  
  // Krok 3: Product Pairing (pokud enablePairing = true)
  pairedProducts?: PairedProduct[]; // Napárované produkty z leceni
  aloeRecommended?: boolean;        // true/false
  merkabaRecommended?: boolean;     // true/false
  
  // Debug
  rawResponse?: string;            // Raw GPT response
  error?: string;                  // Error message pokud success = false
}
```

## 🎯 Integrace do webhook

```typescript
// V webhook handleru
async function handleChatbotWebhook(webhookPayload) {
  const { user_message, bot_response, chatbot_settings } = webhookPayload;
  
  // Spusť orchestraci
  const result = await screenProductsWithPairing(
    user_message,
    bot_response,
    chatbot_settings.enable_product_pairing  // ← Z settings checkboxu
  );
  
  if (result.success) {
    // Ulož do DB, zobraz v UI, nebo pošli jako webhook response
    return {
      problems: result.problems,
      extractedProducts: result.extractedProducts,
      pairedProducts: result.pairedProducts,
      recommendations: {
        aloe: result.aloeRecommended,
        merkaba: result.merkabaRecommended
      }
    };
  }
}
```

## ⚙️ Konfigurace

### Checkbox v Chatbot Settings

V UI je checkbox **"Párování kombinací produktů"**:

```typescript
// chatbot_settings tabulka
{
  enable_product_pairing: true/false  // ← Kontroluje, zda spustit párování
}
```

**Pokud `enable_product_pairing = false`:**
- Funkce vrátí pouze problémy + extrahované produkty
- Párování se přeskočí

**Pokud `enable_product_pairing = true`:**
- Spustí se kompletní flow včetně párování

## 🐛 Troubleshooting

### Problem 1: "Žádné problémy identifikovány"

**Příčina:** Tabulka `leceni` nemá odpovídající kategorie, nebo GPT nenašel match

**Řešení:**
```sql
-- Zkontroluj dostupné problémy
SELECT DISTINCT "Problém" FROM leceni;

-- Přidej testovací problém
INSERT INTO leceni (nazev, "Problém", eo_1, prawtein, aktivni)
VALUES ('Test kombinace', 'Bolest hlavy – ze stresu', 'NOHEPA', 'FRANKINCENSE_PLUS', true);
```

### Problem 2: "Žádné product_code nalezeny"

**Příčina:** Product matching nenašel shodu v `product_feed_2`

**Řešení:**
```sql
-- Zkontroluj produkty v databázi
SELECT product_code, product_name FROM product_feed_2 
WHERE LOWER(product_name) LIKE '%levandule%';

-- Pokud není produkt, synchronizuj Feed 2
-- UI: Správa chatbotu → Produkty → Tab "Feed 2" → Synchronizovat
```

### Problem 3: "Žádné napárované produkty"

**Příčina:** SQL funkce `match_product_combinations` nenašla kombinace

**Řešení:**
```sql
-- Test SQL funkce
SELECT * FROM match_product_combinations(ARRAY['NOHEPA']::TEXT[]);

-- Zkontroluj kombinace v leceni
SELECT * FROM leceni WHERE eo_1 = 'NOHEPA' OR eo_2 = 'NOHEPA' OR eo_3 = 'NOHEPA';

-- Přidej testovací kombinaci
INSERT INTO leceni (nazev, eo_1, prawtein, tcm_wan, aloe, merkaba, aktivni)
VALUES (
  'Podpora trávení a eliminace větru',
  'NOHEPA',
  'FRANKINCENSE_PLUS',
  '004',
  true,
  false,
  true
);
```

## 📚 Další dokumentace

- `PRODUCT_SCREENING_ORCHESTRATION.md` - Kompletní technická dokumentace
- `PRODUCT_PAIRING_IMPLEMENTATION.md` - Detaily o párování
- `test-screening-with-pairing.js` - Testovací script
- `src/services/inlineProductScreeningService.ts` - Implementace

## ✅ Checklist před nasazením

- [ ] Spusť test: `node test-screening-with-pairing.js`
- [ ] Ověř, že tabulka `leceni` má data
- [ ] Ověř, že `product_feed_2` má produkty
- [ ] Zkontroluj SQL funkci `match_product_combinations`
- [ ] Otestuj webhook integraci
- [ ] Zapni checkbox "Párování kombinací produktů" v UI

---

**Potřebuješ pomoc?** Zkontroluj logy v konzoli - každý krok má ✅/❌ indikátor.
