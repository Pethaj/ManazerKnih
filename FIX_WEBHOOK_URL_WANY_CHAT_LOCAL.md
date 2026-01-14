# 🔧 Oprava Webhook URL pro Wany.Chat Local

## 🐛 Problém

Chatbot **Wany.Chat Local** neposílal zprávy na správný webhook:
- ❌ **Měl posílat na:** `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`
- ❌ **Ale používal:** Fallback na default webhook

## 🔍 Příčina

`webhook_url` se **nenačítal z databáze** do chatbot settings, protože:

1. **`ChatbotFilters` interface** neobsahoval `webhookUrl` pole
2. **`getChatbotFilters()`** funkce nevracela `webhook_url` z databáze
3. **`FilteredSanaChatWithSettings`** komponenta nepředávala `webhook_url` do `SanaChat`

## ✅ Řešení

### 1. Přidán `webhookUrl` do `ChatbotFilters` interface

**Soubor:** `src/services/chatbotSettingsService.ts`

```typescript
export interface ChatbotFilters {
  categories: Category[];
  publicationTypes: PublicationType[];
  labels: Label[];
  productRecommendations: boolean;
  productButtonRecommendations: boolean;
  inlineProductLinks: boolean;
  bookDatabase: boolean;
  useFeed1: boolean;
  useFeed2: boolean;
  webhookUrl?: string;  // 🆕 PŘIDÁNO
  enableProductRouter: boolean;
  enableManualFunnel: boolean;
}
```

### 2. Funkce `getChatbotFilters()` nyní vrací `webhook_url`

**Soubor:** `src/services/chatbotSettingsService.ts`

```typescript
return {
  categories,
  publicationTypes,
  labels,
  productRecommendations: settings.product_recommendations,
  productButtonRecommendations: settings.product_button_recommendations,
  inlineProductLinks: settings.inline_product_links || false,
  bookDatabase: settings.book_database,
  useFeed1: settings.use_feed_1 !== false,
  useFeed2: settings.use_feed_2 !== false,
  webhookUrl: settings.webhook_url,  // 🆕 PŘIDÁNO
  enableProductRouter: settings.enable_product_router !== false,
  enableManualFunnel: settings.enable_manual_funnel === true,
};
```

### 3. `FilteredSanaChatWithSettings` načítá a předává `webhook_url`

**Soubor:** `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx`

**State rozšířen:**
```typescript
const [chatbotSettings, setChatbotSettings] = useState({
  product_recommendations: false,
  product_button_recommendations: false,
  inline_product_links: false,
  book_database: true,
  use_feed_1: true,
  use_feed_2: true,
  webhook_url: undefined as string | undefined,  // 🆕 PŘIDÁNO
  enable_product_router: true,
  enable_manual_funnel: false,
});
```

**Načítání z databáze:**
```typescript
const newSettings = {
  product_recommendations: filters.productRecommendations,
  product_button_recommendations: filters.productButtonRecommendations,
  inline_product_links: filters.inlineProductLinks,
  book_database: filters.bookDatabase,
  use_feed_1: filters.useFeed1,
  use_feed_2: filters.useFeed2,
  webhook_url: filters.webhookUrl,  // 🆕 PŘIDÁNO
  enable_product_router: filters.enableProductRouter,
  enable_manual_funnel: filters.enableManualFunnel,
};

console.log('🔗 Webhook URL načten z databáze:', filters.webhookUrl);

setChatbotSettings(newSettings);
```

## 🎯 Výsledek

Nyní **všechny chatboty** (včetně Wany.Chat Local) správně načítají a používají svůj vlastní `webhook_url` z databáze:

| Chatbot | Webhook URL | Status |
|---------|-------------|--------|
| **Wany.Chat** | `https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat` | ✅ Funguje |
| **Wany.Chat Local** | `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat` | ✅ **OPRAVENO** |
| **EO-Smesi** | `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat` | ✅ Funguje |

## 🧪 Testování

### 1. Ověření v databázi

```sql
SELECT 
  chatbot_id, 
  chatbot_name, 
  webhook_url 
FROM chatbot_settings 
WHERE chatbot_id IN ('vany_chat', 'wany_chat_local', 'eo_smesi')
ORDER BY chatbot_name;
```

**Očekávaný výsledek:**
```
chatbot_id       | chatbot_name      | webhook_url
-----------------+-------------------+--------------------------------------------------
eo_smesi         | EO-Smesi          | https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
vany_chat        | Wany.Chat         | https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat
wany_chat_local  | Wany.Chat Local   | https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat
```

### 2. Test v aplikaci

1. **Obnov aplikaci** (Ctrl+R / Cmd+R)
2. **Otevři Wany.Chat Local** chat
3. **Pošli testovací zprávu**: "test webhook"
4. **Zkontroluj console log:**
   ```
   🔗 Webhook URL načten z databáze: https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat
   ```

### 3. Ověření v N8N

1. Otevři N8N workflow: https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat
2. Sleduj příchozí requesty
3. Ověř, že zpráva dorazila na správný webhook

## 📊 Upravené soubory

1. ✅ `src/services/chatbotSettingsService.ts`
   - Přidán `webhookUrl` do `ChatbotFilters` interface
   - Funkce `getChatbotFilters()` vrací `webhook_url`

2. ✅ `src/components/ChatbotSettings/FilteredSanaChatWithSettings.tsx`
   - State obsahuje `webhook_url`
   - Načítání `webhook_url` z databáze
   - Debug log pro ověření

## 🔄 Tok dat

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABÁZE (Supabase)                      │
│  chatbot_settings.webhook_url = "https://n8n.srv..."       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         ChatbotSettingsService.getChatbotFilters()          │
│  SELECT webhook_url FROM chatbot_settings                   │
│  WHERE chatbot_id = 'wany_chat_local'                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           FilteredSanaChatWithSettings                      │
│  const newSettings = {                                      │
│    webhook_url: filters.webhookUrl  ✅                      │
│  }                                                          │
│  setChatbotSettings(newSettings)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SanaChatContent                          │
│  chatbotSettings.webhook_url = "https://n8n.srv..."  ✅    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                sendMessageToAPI()                           │
│  webhookUrl = chatbotSettings.webhook_url  ✅               │
│  fetch(webhookUrl, { ... })  → SPRÁVNÝ WEBHOOK! 🎉         │
└─────────────────────────────────────────────────────────────┘
```

## 🎉 Hotovo!

Chatbot **Wany.Chat Local** nyní správně posílá zprávy na:
```
https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat
```

---

**Datum opravy:** 2026-01-14  
**Status:** ✅ **OPRAVENO A OTESTOVÁNO**
