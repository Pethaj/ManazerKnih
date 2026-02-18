# Product Screening Orchestration - Dokumentace

## 🎯 Účel

Rozšíření `inlineProductScreeningService.ts` o kompletní orchestraci:
1. **Problem Classification** - Identifikace problému z user message
2. **Product Extraction** - Extrakce produktů z bot response  
3. **Product Pairing** - Párování kombinací podle tabulky `leceni`

## 📋 Přehled flow

```
WEBHOOK DORAZÍ
     ↓
┌────────────────────────────────────────────────────────────┐
│  KROK 1: PARALLEL EXECUTION                                 │
│  ────────────────────────────────────────────────────       │
│                                                              │
│  ┌─────────────────────┐     ┌─────────────────────┐      │
│  │ Problem Classifier  │     │ Product Extractor   │      │
│  │                     │     │                     │      │
│  │ Input: User Message │     │ Input: Bot Response │      │
│  │ Output: Problems[]  │     │ Output: Products[]  │      │
│  └─────────────────────┘     └─────────────────────┘      │
│            │                           │                    │
│            └───────────┬───────────────┘                    │
│                        ↓                                    │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  KROK 2: VALIDACE                                           │
│  ─────────────────                                          │
│                                                              │
│  Máme Problems[] AND Products[] ?                           │
│  ┌─── ANO ───→ Pokračuj                                    │
│  └─── NE  ───→ Vrať výsledek bez párování                  │
│                                                              │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  KROK 3: PRODUCT CODE LOOKUP                                │
│  ────────────────────────────                               │
│                                                              │
│  Najdi product_code pro extrahované názvy v product_feed_2  │
│  Fuzzy matching: case-insensitive, obsahuje                 │
│                                                              │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│  KROK 4: PRODUCT PAIRING SERVICE                            │
│  ────────────────────────────────                           │
│                                                              │
│  SQL RPC: match_product_combinations(product_codes[])       │
│                                                              │
│  Výstup:                                                     │
│  - Napárované produkty (Prawteiny, TČM wany)               │
│  - Aloe doporučení                                          │
│  - Merkaba doporučení                                       │
│                                                              │
└────────────────────────────────────────────────────────────┘
                         ↓
                    VÝSLEDEK
```

## 🔧 Implementované funkce

### 1. `screenProductsWithPairing()`

**Hlavní orchestrační funkce**

```typescript
async function screenProductsWithPairing(
  userMessage: string,
  botResponse: string,
  enablePairing: boolean = true
): Promise<ProductScreeningWithPairingResult>
```

**Parametry:**
- `userMessage` - Zpráva od uživatele (např. "Bolí mě hlava ze stresu")
- `botResponse` - Odpověď chatbota (obsahuje zmínky o produktech)
- `enablePairing` - Zapnuto párování kombinací? (z chatbot settings)

**Návratová hodnota:**
```typescript
interface ProductScreeningWithPairingResult {
  success: boolean;
  problems: string[];              // Identifikované problémy
  extractedProducts: string[];     // Extrahované produkty
  pairedProducts?: any[];          // Napárované produkty
  aloeRecommended?: boolean;       // Aloe doporučení
  merkabaRecommended?: boolean;    // Merkaba doporučení
  rawResponse?: string;            // Debug
  error?: string;                  // Error message
}
```

**Proces:**
1. ⚡ **Parallel** - Spustí Problem Classifier + Product Extractor současně
2. ⏳ **Čekání** - Vyčká na oba výsledky (`Promise.all`)
3. ✅ **Validace** - Zkontroluje, že máme problémy i produkty
4. 🔍 **Lookup** - Najde `product_code` pro extrahované názvy
5. 🔗 **Pairing** - Spustí `matchProductCombinations()` z `productPairingService`

### 2. `findProductCodesByNames()`

**Helper funkce pro nalezení product_code**

```typescript
async function findProductCodesByNames(
  productNames: string[]
): Promise<string[]>
```

**Matching logika:**
- **Match 1**: Extrahovaný název je obsažen v `product_name`
- **Match 2**: `product_name` je obsažen v extrahovaném názvu
- **Match 3**: Po odstranění "esenciální olej", "BEWIT", "PRAWTEIN" zkus znovu
- **Case-insensitive**
- **Deduplikace** výsledků

**Příklady:**
```
"LEVANDULE" → "2345" (LEVANDULE esenciální olej)
"Kadidlo" → "2346" (BEWIT KADIDLO esenciální olej)
"PRAWTEIN Aloe Vera Plus" → "5678" (PRAWTEIN Aloe Vera Plus)
"NOPA" → "1234" (NOPA směs)
```

## 📦 Závislosti

### Service Dependencies

```typescript
import { classifyProblemFromUserMessage } from './problemClassificationService';
import { matchProductCombinations } from './productPairingService';
```

### Volané služby:

1. **Problem Classification Service**
   - Funkce: `classifyProblemFromUserMessage(userMessage)`
   - Volá: Edge Function `openrouter-proxy` s Haiku
   - Vrací: `ProblemClassificationResult`

2. **Product Pairing Service**
   - Funkce: `matchProductCombinations(productCodes)`
   - Volá: SQL RPC `match_product_combinations`
   - Vrací: `PairingRecommendations`

3. **Inline Product Screening** (stávající)
   - Funkce: `screenTextForProducts(botResponse)`
   - Volá: Edge Function `openrouter-proxy` s Haiku
   - Vrací: `ScreeningResult`

### Databázové tabulky:

- `leceni` - Kombinace problémů a produktů
- `product_feed_2` - Produktový feed pro lookup
- `product_embeddings` - Pro budoucí sémantické vyhledávání

## 🧪 Testování

### 1. Unit Test (TypeScript)

```typescript
import { testProductScreeningWithPairing } from './services/inlineProductScreeningService';

// V konzoli prohlížeče nebo Node.js
await testProductScreeningWithPairing();
```

### 2. Konzolový Test (Node.js)

```bash
node test-screening-with-pairing.js
```

**Testovací scénář:**
- **User message**: "Bolí mě hlava ze stresu a jsem přepracovaný"
- **Bot response**: Obsahuje LEVANDULE, KADIDLO, RELAX, NOPA, PRAWTEIN Aloe Vera Plus
- **Očekávaný výsledek**:
  - Problem: "Bolest hlavy – ze stresu"
  - Products: ["LEVANDULE", "KADIDLO", "RELAX", "NOPA", "PRAWTEIN Aloe Vera Plus"]
  - Paired: Doporučené produkty z tabulky `leceni`

### 3. Validační SQL queries

```sql
-- Zkontroluj dostupné problémy
SELECT DISTINCT "Problém" FROM leceni ORDER BY "Problém";

-- Zkontroluj kombinace pro konkrétní problém
SELECT * FROM leceni WHERE "Problém" LIKE '%Bolest hlavy%';

-- Test párování
SELECT * FROM match_product_combinations(ARRAY['NOHEPA', 'BESTFRIEND']::TEXT[]);

-- Zkontroluj product_feed_2 pro matching
SELECT product_code, product_name 
FROM product_feed_2 
WHERE LOWER(product_name) LIKE '%levandule%';
```

## 🎛️ Konfigurace

### Chatbot Settings

Funkce reaguje na checkbox **"Párování kombinací produktů"** v chatbot settings:

```typescript
interface ChatbotSettings {
  enable_product_pairing: boolean; // ← Tento flag
}
```

**Pokud `enable_product_pairing = true`:**
- ✅ Spustí kompletní flow (Problem + Products + Pairing)

**Pokud `enable_product_pairing = false`:**
- ⚠️ Vrátí pouze extrahované produkty, bez párování

## 📊 Logování

Funkce loguje každý krok do konzole:

```
🚀 Spouštím kompletní product screening s párováním...
📥 User message: Bolí mě hlava ze stresu
📥 Bot response length: 245
🔗 Párování zapnuto: true

⚡ Spouštím parallel: Problem Classification + Product Extraction...
✅ Problem Classification dokončena: ["Bolest hlavy – ze stresu"]
✅ Product Extraction dokončena: ["LEVANDULE", "KADIDLO"]

🔗 Spouštím Product Pairing Service...
📋 Vstup - Problémy: ["Bolest hlavy – ze stresu"]
📋 Vstup - Produkty: ["LEVANDULE", "KADIDLO"]

🔍 Hledám product_code pro názvy: ["LEVANDULE", "KADIDLO"]
   ✅ Match: "LEVANDULE" → 2345 (LEVANDULE esenciální olej)
   ✅ Match: "KADIDLO" → 2346 (BEWIT KADIDLO esenciální olej)
🔍 Nalezené product_code: ["2345", "2346"]

✅ Product Pairing dokončeno:
   - Napárované produkty: 2
   - Aloe doporučeno: true
   - Merkaba doporučeno: false

🎉 Kompletní screening dokončen!
```

## 🔄 Integrace s Webhook

### Použití v webhook handleru

```typescript
// V webhook handleru (např. Edge Function nebo API route)
import { screenProductsWithPairing } from './services/inlineProductScreeningService';

async function handleWebhook(webhookData: WebhookPayload) {
  const { user_message, bot_response, chatbot_settings } = webhookData;
  
  // Spusť orchestraci
  const result = await screenProductsWithPairing(
    user_message,
    bot_response,
    chatbot_settings.enable_product_pairing
  );
  
  if (result.success) {
    // Máme problémy, produkty a napárované kombinace
    console.log('Problémy:', result.problems);
    console.log('Produkty:', result.extractedProducts);
    console.log('Napárované:', result.pairedProducts);
    console.log('Aloe:', result.aloeRecommended);
    console.log('Merkaba:', result.merkabaRecommended);
    
    // Ulož do databáze, zobraz v UI, atd.
  } else {
    console.error('Chyba:', result.error);
  }
}
```

## ⚠️ Error Handling

Funkce má robustní error handling:

1. **Problem Classification selhání** → Vrátí prázdné `problems: []`
2. **Product Extraction selhání** → Vrátí prázdné `extractedProducts: []`
3. **Product Code Lookup selhání** → Přeskočí párování
4. **Product Pairing selhání** → Vrátí výsledek bez párování (non-blocking)
5. **Kritická chyba** → Vrátí `success: false` + error message

**Všechny chyby jsou logovány, ale nepřerušují flow.**

## 🚀 Performance

- **Parallel execution** - Problem Classification + Product Extraction běží současně
- **Single database query** - Product code lookup načte celou tabulku jednou (cacheable)
- **Non-blocking errors** - Chyba v párování nerozbi celý flow
- **Optimalizované matching** - Fuzzy match s normalizací jen jednou na produkt

**Typický čas:**
- Problem Classification: ~1-2s
- Product Extraction: ~1-2s
- Product Code Lookup: ~100ms
- Product Pairing: ~200ms
- **Celkem: ~2-3s** (díky parallel execution)

## 📝 TODO / Budoucí rozšíření

- [ ] Cache pro `product_feed_2` lookup (snížit DB calls)
- [ ] Sémantické vyhledávání pro product matching (vector similarity)
- [ ] Webhook endpoint pro testování z Postman
- [ ] Metrics logging (success rate, latency)
- [ ] Admin UI pro zobrazení párování v chatbot historii
- [ ] A/B testing s/bez párování

## 📚 Související dokumentace

- `PRODUCT_PAIRING_IMPLEMENTATION.md` - Detaily o párování
- `problemClassificationService.ts` - Problem Classifier
- `productPairingService.ts` - Pairing logika
- `supabase/migrations/20260218_product_pairing_leceni.sql` - DB schéma

---

**Autor:** Petr Hajduk  
**Datum:** 2026-02-18  
**Status:** ✅ Implementováno a testováno
