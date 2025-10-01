# Kombinované vyhledávání - Knihy + Produkty

## Přehled

Systém nyní podporuje kombinované vyhledávání, které koordinuje současné volání webhooků pro databázi knih a produktový feed s prioritizací knih.

## Logika fungování

### Scénáře podle nastavení chatbota

1. **Pouze knihy** (`book_database: true, product_recommendations: false`)
   - Volá pouze webhook pro knihy
   - Standardní chování bez změn

2. **Pouze produkty** (`book_database: false, product_recommendations: true`)
   - Volá pouze webhook pro produkty
   - Zobrazí produktový carousel

3. **🆕 Kombinované vyhledávání** (`book_database: true, product_recommendations: true`)
   - Spustí oba webhooky **současně**
   - Aplikuje pravidla prioritizace (viz níže)

### Pravidla prioritizace

#### Knihy mají vždy prioritu - zobrazí se jako první

1. **Knihy dorazí první** → Zobrazí se ihned, produkty se přidají později
2. **Produkty dorazí první** → Čeká na knihy, pak zobrazí oboje najednou
3. **Dorazí současně** → Zobrazí vše najednou

#### Příklad časování

```
Čas: 0ms     → Spuštění obou webhooků
Čas: 800ms   → Produkty dokončeny (čekají)
Čas: 1200ms  → Knihy dokončeny → Zobrazí knihy + produkty najednou

NEBO

Čas: 0ms     → Spuštění obou webhooků  
Čas: 900ms   → Knihy dokončeny → Zobrazí knihy ihned
Čas: 1400ms  → Produkty dokončeny → Přidá produkty k existující zprávě
```

## Implementace

### Klíčové soubory

- `src/services/combinedSearchService.ts` - Logika koordinace webhooků
- `src/components/SanaChat/SanaChat.tsx` - Integrace do UI
- `src/services/testCombinedSearch.ts` - Testy funkčnosti

### API webhooků

**Webhook pro knihy:**
```
URL: https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat
Payload: {
  sessionId: string,
  action: "sendMessage", 
  chatInput: string,
  chatHistory: ChatMessage[],
  metadata?: {
    categories?: string[],
    labels?: string[],
    publication_types?: string[]
  }
}
```

**Webhook pro produkty:**
```
URL: https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b
Payload: {
  chatInput: string,
  session_id: string,
  timestamp: string
}
```

### Koordinační mechanismus

```typescript
// Spuštění obou webhooků současně
const [bookResult, productResult] = await Promise.all([
  callBookWebhook(message, sessionId, history, metadata),
  callProductWebhook(message, sessionId)
]);

// Callback systém pro postupné zobrazování
onBooksReceived: (result) => {
  // Zobrazí výsledky z knih (priorita)
  setMessages(prev => [...prev, bookMessage]);
}

onProductsReceived: (products) => {
  // Přidá produkty k existující zprávě
  setMessages(prev => prev.map(msg => 
    msg.id === targetMessageId 
      ? { ...msg, productRecommendations: [...existing, ...products] }
      : msg
  ));
}
```

## Výhody

1. **Rychlejší odpověď** - Webhooky běží paralelně
2. **Prioritizace obsahu** - Knihy vždy první
3. **Lepší UX** - Uživatel vidí výsledky postupně
4. **Robustnost** - Funguje i při chybě jednoho webhook
5. **Fallback** - Zachovává původní chování pro jednotlivé zdroje

## Testování

### Ruční test
```typescript
import { testCombinedSearch } from './src/services/testCombinedSearch';

// Spustí test koordinace
testCombinedSearch();
```

### Očekávané výsledky
- Oba webhooky se spustí současně
- Knihy se zobrazí první (nebo současně s produkty)
- Produkty se přidají k výsledkům
- Časování se loguje do konzole

## Ladění

### Console logy
```
🚀 Kombinované vyhledávání: knihy + produkty současně s prioritizací knih
📚 Volám webhook pro databázi knih...
🛍️ Volám webhook pro produktový feed...
📚 Knihy webhook dokončen za 1200ms
🛍️ Produkty webhook dokončen za 800ms
🛍️ Produkty dorazily první - čekám na knihy
🎯 Produkty čekaly na knihy - zobrazuji vše najednou
✅ Kombinované vyhledávání dokončeno za 1200ms
```

### Možné problémy

1. **Webhook nedostupný** - Jeden zdroj selže, druhý pokračuje
2. **Pomalý webhook** - Timeout 15s, pak pokračuje
3. **Nesprávné pořadí** - Systém automaticky čeká na knihy
4. **Duplicitní produkty** - Kontrola v concatenaci výsledků

## Migrace z původního systému

**Před:**
```typescript
// Jen knihy NEBO jen produkty
if (bookDatabase) {
  const result = await bookWebhook();
} else if (productRecommendations) {
  const result = await productWebhook();
}
```

**Po:**
```typescript
// Knihy + produkty současně s koordinací
if (bookDatabase && productRecommendations) {
  await performCombinedSearch(query, sessionId, history, metadata, 
    onBooksReceived, onProductsReceived);
}
```

Stávající kód pro jednotlivé zdroje zůstává beze změn - **zpětně kompatibilní**.
