# Product Chat - Implementace dokončena ✅

## Přehled

Product Chat je nový chatbot pro produktová doporučení BEWIT s hyper-personalizovanými texty pro každý produkt. Využívá N8N webhook pro RAG (Retrieval-Augmented Generation) proces a aplikace pouze obohacuje výsledky o metadata z `product_feed_2`.

## Co bylo implementováno

### 1. ✅ productChatWebhookService.ts

**Umístění**: `src/services/productChatWebhookService.ts`

**Funkce**:
- `callProductChatWebhook()` - Volá N8N webhook s dotazem uživatele
- `enrichProductsWithMetadata()` - Obohacuje produkty o metadata z `product_feed_2`
- `getProductRecommendations()` - Hlavní funkce pro kompletní workflow
- `testProductChatWebhook()` - Test funkce

**Webhook URL**: `https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b-1e35-4018-9bf4-28d0926b023b`

**Request format**:
```json
{
  "chatInput": "wany na bolest nohy",
  "session_id": "abc-123",
  "timestamp": "2024-11-25T10:00:00Z"
}
```

**Response format** (očekáváno od N8N):
```json
{
  "text": "Našel jsem pro vás 6 wan...",
  "products": [
    {
      "product_code": "2324",
      "recommendation": "Personalizované doporučení pro tento produkt..."
    }
  ]
}
```

### 2. ✅ ProductChat komponenta

**Umístění**: `src/components/ProductChat/ProductChat.tsx`

**Features**:
- Samostatný chat interface s vlastním designem
- Chat historie (user + bot messages)
- ProductCarousel integrace pro zobrazení produktů
- Loading states a error handling
- Auto-scroll na nové zprávy
- Session management

**UI Komponenty**:
- Header s logem a zavíracím tlačítkem
- Chat messages area s avatary
- ProductCarousel s personalizovanými doporučeními
- Input field s Enter-to-send
- Typing indicator pro loading

### 3. ✅ ChatbotManagement integrace

**Umístění**: `src/components/ChatbotManagement.tsx`

**Změny**:
- Import ProductChat komponenty
- State `showProductChat` pro modal
- Speciální tlačítko "💬 Otevřít Product Chat" pro `chatbot_id === 'product_chat'`
- Modal s Product Chat komponentou (fullscreen overlay)

**Zobrazení**:
- Tlačítko se zobrazuje pouze pro Product Chat chatbot
- Zelené zvýraznění pro odlišení od ostatních chatbotů
- Popis: "Produktový chat s personalizovanými doporučeními přes N8N webhook"

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        UŽIVATEL                                 │
│               "wany na bolest nohy"                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCT CHAT UI                               │
│         (src/components/ProductChat/ProductChat.tsx)            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              productChatWebhookService                          │
│        getProductRecommendations(query, sessionId)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      N8N WEBHOOK                                │
│  POST https://n8n.srv980546.hstgr.cloud/webhook/cd6b668b...     │
│                                                                 │
│  RAG Process:                                                   │
│  1. Generuj embedding dotazu                                    │
│  2. Vyhledej v product_documents                                │
│  3. Pošli kontext do GPT                                        │
│  4. GPT vygeneruje personalizované doporučení                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    N8N RESPONSE                                 │
│  {                                                              │
│    text: "Doporučuji tyto wany...",                             │
│    products: [                                                  │
│      { product_code: "2324",                                    │
│        recommendation: "Personalizace..." }                     │
│    ]                                                            │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         enrichProductsWithMetadata()                            │
│                                                                 │
│  SELECT * FROM product_feed_2                                   │
│  WHERE product_code IN ('2324', '2347', ...)                    │
│                                                                 │
│  Získá:                                                         │
│  - product_name                                                 │
│  - url, thumbnail                                               │
│  - price, currency                                              │
│  - availability                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               OBOHACENÉ PRODUKTY                                │
│  [                                                              │
│    {                                                            │
│      product_code: "2324",                                      │
│      product_name: "009 - Čistý dech",                          │
│      recommendation: "Personalizace...", ⭐                      │
│      url: "https://bewit.love/...",                             │
│      image_url: "https://bewit.love/images/...",                │
│      price: 175,                                                │
│      currency: "CZK",                                           │
│      availability: 1                                            │
│    }                                                            │
│  ]                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PRODUCT CAROUSEL                                   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ Produkt 1│ │ Produkt 2│ │ Produkt 3│ ...                    │
│  │ ⭐ Person│ │ ⭐ Person│ │ ⭐ Person│                          │
│  │ 175 CZK  │ │ 189 CZK  │ │ 210 CZK  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Použití

### 1. Otevření Product Chat

1. Přihlaste se do aplikace
2. Klikněte na "🤖 Správa chatbotů" v horní liště
3. V seznamu chatbotů najděte **Product Chat**
4. Klikněte na zelené tlačítko **"💬 Otevřít Product Chat"**

### 2. Zadání dotazu

Příklady dotazů:
- "wany na bolest nohy"
- "produkty pro lepší spánek"
- "co doporučujete na trávení"
- "tradiční čínská medicína na únavu"

### 3. Výsledky

Obdržíte:
- **Text odpověď** od GPT chatbota
- **Carousel s 6 produkty**, každý s:
  - Názvem produktu
  - ⭐ **Personalizovaným doporučením** (proč je vhodný pro váš dotaz)
  - Obrázkem produktu
  - Cenou
  - Tlačítkem "Zobrazit produkt" (link na bewit.love)

## Testování

### Manuální test

1. Otevřete Product Chat
2. Zadejte: "test dotaz"
3. Očekávaný výsledek:
   - Bot odpoví s textem
   - Zobrazí se carousel s produkty (pokud N8N vrátil produkty)
   - Produkty mají všechna metadata (název, obrázek, cena)

### Test v browser console

```javascript
// Test webhooku
import { testProductChatWebhook } from './services/productChatWebhookService';
testProductChatWebhook().then(result => {
  console.log('Test result:', result);
});

// Test kompletního flow
import { getProductRecommendations } from './services/productChatWebhookService';
getProductRecommendations("wany na bolest", "test-session-123").then(result => {
  console.log('Text:', result.text);
  console.log('Products:', result.products);
});
```

### Kontrola v Supabase

```sql
-- Zkontroluj že product_feed_2 má data
SELECT COUNT(*) FROM product_feed_2;

-- Zkontroluj konkrétní produkt
SELECT * FROM product_feed_2 WHERE product_code = '2324';

-- Zkontroluj dostupnost metadat
SELECT 
  COUNT(*) as total,
  COUNT(thumbnail) as with_image,
  COUNT(price) as with_price,
  COUNT(url) as with_url
FROM product_feed_2;
```

## N8N Webhook

### Požadavky na N8N workflow

N8N webhook musí:
1. Přijmout `chatInput`, `session_id`, `timestamp`
2. Vygenerovat embedding z `chatInput`
3. Vyhledat v `product_documents` (similarity search)
4. Předat kontext do GPT
5. GPT vygeneruje personalizovaná doporučení pro každý produkt
6. Vrátit JSON response:

```json
{
  "text": "string - celková odpověď chatbota",
  "products": [
    {
      "product_code": "string - např. 2324",
      "recommendation": "string - personalizované doporučení"
    }
  ]
}
```

### Debug N8N

Pokud webhook nefunguje, zkontrolujte:
1. N8N workflow je aktivní
2. Webhook URL je správná
3. N8N vrací správný formát (text + products array)
4. product_code existuje v `product_feed_2` tabulce

## Řešení problémů

### Chyba: "N8N webhook failed"

**Příčina**: N8N webhook neodpovídá nebo vrací chybu

**Řešení**:
1. Zkontrolujte N8N workflow logs
2. Otestujte webhook manuálně (Postman/curl)
3. Ověřte, že webhook URL je dostupná

### Produkty nemají obrázky

**Příčina**: Metadata v `product_feed_2` chybí thumbnail

**Řešení**:
1. Zkontrolujte Feed 2 synchronizaci
2. Ověřte že XML feed obsahuje THUMBNAIL element
3. Spusťte manuální sync v "Správa chatbotů" → "Produktový feed"

### Personalizace se nezobrazuje

**Příčina**: N8N nevrací `recommendation` pole

**Řešení**:
1. Zkontrolujte N8N response format
2. Ověřte že GPT generuje doporučení
3. Zkontrolujte N8N workflow mapping

## Soubory

**Nové soubory**:
- `src/services/productChatWebhookService.ts` - Webhook service
- `src/components/ProductChat/ProductChat.tsx` - UI komponenta
- `src/components/ProductChat/index.ts` - Export

**Upravené soubory**:
- `src/components/ChatbotManagement.tsx` - Přidání tlačítka a modalu

**Nedotčené soubory**:
- `src/components/SanaChat/*` - Bez změn
- `src/services/hybridProductService.ts` - Bez změn
- `src/services/embeddingService.ts` - Bez změn

## Poznámky

- **Personalizace je klíčová**: Každý produkt má své unique doporučení z GPT
- **N8N dělá RAG**: Embedding, vyhledávání, GPT - vše na straně N8N
- **Aplikace jen zobrazuje**: Fetchne metadata a ukáže v carousel
- **Feed 2 only**: Pouze `product_feed_2` tabulka
- **Max 6 produktů**: Carousel zobrazí maximálně prvních 6 produktů (i když N8N vrátí více)

## Další kroky

### Pro N8N webhook:
- [ ] Implementovat generování embeddingů z dotazu
- [ ] Nastavit similarity search v product_documents
- [ ] Vytvořit GPT prompt pro personalizaci
- [ ] Vrátit správný JSON format

### Pro aplikaci:
- [ ] Přidat analytics (kolik dotazů, které produkty nejčastěji)
- [ ] Přidat možnost filtrace podle kategorie
- [ ] Implementovat historii chatu (perzistence)
- [ ] Přidat export konverzace do PDF

---

**Verze**: 1.0  
**Datum**: 25. listopadu 2024  
**Status**: ✅ Implementováno a připraveno k testování

