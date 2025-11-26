# 🚀 Quick Start: Produktové doporučení na tlačítko

## ⚡ Rychlý návod na zprovoznění nové funkce

### Krok 1: Spusť databázovou migraci

```bash
# Přihlas se do Supabase SQL Editor
# Zkopíruj obsah souboru add_product_button_recommendations.sql
# Spusť SQL script
```

Nebo z příkazové řádky:
```bash
psql -h db.supabase.co -U postgres -d postgres < add_product_button_recommendations.sql
```

### Krok 2: Nastav N8N webhook URL

V souboru `src/services/productButtonRecommendationService.ts`:

```typescript
// Nahraď tímto URL skutečnou N8N webhook URL
const BUTTON_RECOMMENDATIONS_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/TVOJE-WEBHOOK-ID';
```

### Krok 3: Aktivuj funkci v administraci

1. Otevři **Správu chatbotů**
2. Vyber chatbota (např. Sana Chat)
3. Zaškrtni **"Produktové doporučení na tlačítko"**
4. Klikni na **"Uložit nastavení"**

### Krok 4: Použij tlačítko v chatbot UI

Přidej komponentu do tvého chatbota:

```tsx
import ProductRecommendationButton from '@/components/ProductRecommendationButton';

// V chatbot odpovědi
<div className="bot-message">
  <p>{botResponse}</p>
  
  {/* Zobraz tlačítko pokud je funkce zapnutá */}
  {chatbotSettings.product_button_recommendations && (
    <ProductRecommendationButton
      userQuery={lastUserQuery}
      botResponse={currentBotResponse}
      sessionId={sessionId}
      onProductsLoaded={(products) => {
        console.log('Načteno produktů:', products.length);
      }}
    />
  )}
</div>
```

## 🎯 Příklad použití

### Varianta 1: Základní použití

```tsx
<ProductRecommendationButton
  userQuery="Potřebuji něco na bolest hlavy"
  botResponse="Pro bolest hlavy doporučuji..."
  sessionId="session-abc123"
/>
```

### Varianta 2: S callbackem

```tsx
<ProductRecommendationButton
  userQuery={lastUserQuery}
  botResponse={currentBotResponse}
  sessionId={sessionId}
  onProductsLoaded={(products) => {
    // Udělej něco s načtenými produkty
    console.log('Produkty:', products);
    trackEvent('products_recommended', { count: products.length });
  }}
/>
```

### Varianta 3: Custom styling

```tsx
<ProductRecommendationButton
  userQuery={lastUserQuery}
  botResponse={currentBotResponse}
  sessionId={sessionId}
  className="my-custom-button"
/>
```

## 🔧 N8N Workflow Setup

### Vytvoř nový webhook v N8N:

1. **Webhook Trigger Node**
   - Method: POST
   - Path: `/webhook/CUSTOM-PATH`
   - Response Mode: Using 'Respond to Webhook' Node

2. **GPT-4 Node**
   - Prompt:
   ```
   Uživatel se zeptal: "{{$json["userQuery"]}}"
   Chatbot odpověděl: "{{$json["botResponse"]}}"
   
   Na základě tohoto kontextu vyber 5-6 nejvhodnějších produktů
   z databáze BEWIT a pro každý produkt napiš personalizované
   doporučení (2-3 věty) vysvětlující, proč je vhodný pro
   danou situaci.
   ```

3. **Supabase Node**
   - Operation: Get rows
   - Table: `product_feed_2`
   - Filters: (podle výstupu z GPT)

4. **Code Node** (Format Response)
   ```javascript
   return {
     data: items.map(item => ({
       "ID produktu": item.product_code,
       "Doporuceni": item.recommendation
     }))
   };
   ```

5. **Respond to Webhook Node**
   - Response Body: `{{ $json }}`

### Zkopíruj webhook URL a vlož do kódu

```typescript
const BUTTON_RECOMMENDATIONS_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/TVOJE-ID';
```

## ✅ Testování

### 1. Test servicu

```typescript
import { testButtonRecommendationsWebhook } from '@/services/productButtonRecommendationService';

const result = await testButtonRecommendationsWebhook();
console.log('Test:', result ? '✅ Úspěšný' : '❌ Selhalo');
```

### 2. Manuální test v prohlížeči

1. Otevři chat
2. Napiš dotaz: "bolest hlavy"
3. Počkej na odpověď
4. Klikni na tlačítko **"💊 Doporučit produkty"**
5. Měl by se zobrazit carousel s produkty

### 3. Console logs

Zkontroluj console pro debug informace:
```
🔘 Kliknutí na tlačítko produktových doporučení
📝 User Query: bolest hlavy
🤖 Bot Response: Pro bolest hlavy...
🚀 Volám N8N webhook...
✅ Produkty načteny: 6
```

## 🐛 Troubleshooting

### Tlačítko se nezobrazuje
```typescript
// Zkontroluj nastavení
const settings = await ChatbotSettingsService.getChatbotSettings('sana_chat');
console.log('product_button_recommendations:', settings.product_button_recommendations);
// Mělo by být: true
```

### N8N webhook selhává
```bash
# Test webhook přímo
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/TVOJE-ID \
  -H "Content-Type: application/json" \
  -d '{
    "userQuery": "test",
    "botResponse": "test response",
    "session_id": "test-123"
  }'
```

### Produkty se nenačítají
```sql
-- Zkontroluj product_feed_2
SELECT COUNT(*) FROM product_feed_2;
SELECT * FROM product_feed_2 LIMIT 5;

-- Zkontroluj RLS policies
SELECT * FROM pg_policies WHERE tablename = 'product_feed_2';
```

## 📚 Další dokumentace

- [Kompletní dokumentace](./PRODUCT_BUTTON_RECOMMENDATIONS.md)
- [Product Chat Implementation](./PRODUCT_CHAT_IMPLEMENTATION.md)
- [N8N Response Format](./N8N_RESPONSE_FORMAT.md)

## 📦 Soubory které byly vytvořeny

```
✅ src/services/productButtonRecommendationService.ts   - Service pro API
✅ src/components/ProductRecommendationButton.tsx       - UI komponenta
✅ add_product_button_recommendations.sql               - SQL migrace
✅ PRODUCT_BUTTON_RECOMMENDATIONS.md                    - Kompletní docs
✅ PRODUCT_BUTTON_QUICK_START.md                        - Tento soubor
```

## 📝 Soubory které byly upraveny

```
✅ src/services/chatbotSettingsService.ts               - Přidán product_button_recommendations
✅ src/components/ChatbotManagement.tsx                 - Přidán UI checkbox
```

---

**Hotovo!** 🎉 Funkce je připravena k použití.

Zbývá už jen:
1. ✅ Spustit SQL migraci
2. ✅ Nastavit N8N webhook URL
3. ✅ Aktivovat funkci v administraci
4. ✅ Přidat tlačítko do chatbot UI

**Vytvořeno:** 2025-11-26

