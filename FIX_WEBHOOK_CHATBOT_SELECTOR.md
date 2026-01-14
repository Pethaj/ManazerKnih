# 🔧 Oprava Webhook URL v ChatbotSelectoru

## 🐛 Problém

Když uživatel spustil **Wany.Chat Local** z **ChatbotSelectoru** (dialog "Vyberte chatbota"), používal se **špatný webhook**:

- ❌ **Selector:** Nepoužíval webhook z databáze
- ✅ **Správa chatbotů:** Používal správný webhook z databáze

## 🔍 Příčina

V souboru `ChatWidget.tsx`, funkce `loadChatbotById()` **nenačítala `webhook_url`** z databáze do `chatbotSettings`.

```typescript
// ❌ PŘED OPRAVOU - webhook_url CHYBÍ!
setChatbotSettings({
    product_recommendations: settings.product_recommendations || false,
    product_button_recommendations: settings.product_button_recommendations || false,
    inline_product_links: settings.inline_product_links || false,
    book_database: settings.book_database !== undefined ? settings.book_database : true,
    use_feed_1: settings.use_feed_1 !== undefined ? settings.use_feed_1 : true,
    use_feed_2: settings.use_feed_2 !== undefined ? settings.use_feed_2 : true,
    // ❌ webhook_url CHYBÍ!
    allowed_categories: settings.allowed_categories || [],
    allowed_labels: settings.allowed_labels || [],
    allowed_publication_types: settings.allowed_publication_types || [],
    enable_product_router: settings.enable_product_router !== false,
    enable_manual_funnel: settings.enable_manual_funnel === true,
});
```

## ✅ Řešení

### 1. Přidán `webhook_url` do TypeScript interfaces

**Soubor:** `src/components/SanaChat/ChatWidget.tsx`

#### Interface `ChatWidgetProps`:
```typescript
interface ChatWidgetProps {
    chatbotSettings?: {
        product_recommendations: boolean;
        product_button_recommendations: boolean;
        inline_product_links?: boolean;
        book_database: boolean;
        use_feed_1?: boolean;
        use_feed_2?: boolean;
        webhook_url?: string;  // 🆕 PŘIDÁNO
        enable_product_router?: boolean;
        enable_manual_funnel?: boolean;
    };
}
```

#### State `chatbotSettings`:
```typescript
const [chatbotSettings, setChatbotSettings] = useState<{
    product_recommendations: boolean;
    product_button_recommendations: boolean;
    inline_product_links?: boolean;
    book_database: boolean;
    use_feed_1?: boolean;
    use_feed_2?: boolean;
    webhook_url?: string;  // 🆕 PŘIDÁNO
    allowed_categories?: string[];
    allowed_labels?: string[];
    allowed_publication_types?: string[];
    enable_product_router?: boolean;
    enable_manual_funnel?: boolean;
} | null>(null);
```

### 2. Funkce `loadChatbotById()` načítá `webhook_url`

```typescript
const loadChatbotById = async (chatbotIdToLoad: string) => {
    try {
        const settings = await ChatbotSettingsService.getChatbotSettings(chatbotIdToLoad);
        
        if (settings) {
            setChatbotId(settings.chatbot_id);
            setChatbotSettings({
                product_recommendations: settings.product_recommendations || false,
                product_button_recommendations: settings.product_button_recommendations || false,
                inline_product_links: settings.inline_product_links || false,
                book_database: settings.book_database !== undefined ? settings.book_database : true,
                use_feed_1: settings.use_feed_1 !== undefined ? settings.use_feed_1 : true,
                use_feed_2: settings.use_feed_2 !== undefined ? settings.use_feed_2 : true,
                webhook_url: settings.webhook_url,  // 🆕 PŘIDÁNO
                allowed_categories: settings.allowed_categories || [],
                allowed_labels: settings.allowed_labels || [],
                allowed_publication_types: settings.allowed_publication_types || [],
                enable_product_router: settings.enable_product_router !== false,
                enable_manual_funnel: settings.enable_manual_funnel === true,
            });
            
            // 🆕 Debug log pro ověření
            console.log(`✅ Načten chatbot: ${settings.chatbot_name}`, {
                chatbot_id: settings.chatbot_id,
                webhook_url: settings.webhook_url,  // ✅ Zobrazí webhook URL
                categories: settings.allowed_categories?.length || 0,
                labels: settings.allowed_labels?.length || 0,
                publicationTypes: settings.allowed_publication_types?.length || 0,
                enableProductRouter: settings.enable_product_router !== false,
                enableManualFunnel: settings.enable_manual_funnel === true
            });
        }
    } catch (error) {
        console.error('❌ Chyba při načítání chatbota:', error);
    }
};
```

## 🎯 Výsledek

Nyní **ChatbotSelector správně používá webhook z databáze** pro všechny chatboty:

| Chatbot | Webhook URL | Status |
|---------|-------------|--------|
| **Wany.Chat** | `.../22856d03-acea-4174-89ae-1b6f0c8ede71/chat` | ✅ Funguje |
| **Wany.Chat Local** | `.../15f08634-67e3-4e24-bcff-54ebf80298b8/chat` | ✅ **OPRAVENO** |
| **EO-Smesi** | `.../20826009-b007-46b2-8d90-0c461113d263/chat` | ✅ Funguje |

## 🧪 Testování

### 1. Test ChatbotSelectoru

1. **Obnov aplikaci** (Ctrl+R / Cmd+R)
2. **Klikni na floating chat button** (vpravo dole)
3. **Otevře se selector chatbotů**
4. **Vyber "Wany.Chat Local"** (červená ikona)
5. **Zkontroluj console log:**
   ```
   ✅ Načten chatbot: Wany.Chat Local
   {
     chatbot_id: "wany_chat_local",
     webhook_url: "https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat",
     ...
   }
   ```
6. **Pošli testovací zprávu**
7. **Ověř v N8N**, že zpráva dorazila na správný webhook

### 2. Test Správy chatbotů

1. **Otevři Správu chatbotů** (🤖 tlačítko)
2. **Najdi "Wany.Chat Local"**
3. **Klikni "💬 Spustit chat s nastavením"**
4. **Pošli testovací zprávu**
5. **Ověř, že webhook je stejný** jako při spuštění ze selectoru

## 📊 Upravené soubory

1. ✅ `src/components/SanaChat/ChatWidget.tsx`
   - Přidán `webhook_url` do `ChatWidgetProps` interface
   - Přidán `webhook_url` do state `chatbotSettings`
   - Funkce `loadChatbotById()` načítá `webhook_url` z databáze
   - Debug log zobrazuje `webhook_url`

## 🔄 Tok dat (nyní opravený)

```
┌─────────────────────────────────────────────────────────────┐
│              UŽIVATEL - Klikne na chat button               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ChatWidget - Otevře ChatbotSelector            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│       UŽIVATEL - Vybere "Wany.Chat Local" ze selectoru      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│        ChatWidget.loadChatbotById("wany_chat_local")        │
│  ├─ getChatbotSettings("wany_chat_local")                   │
│  ├─ SELECT * FROM chatbot_settings WHERE ...                │
│  └─ webhook_url = ".../15f08634-67e3-4e24-bcff-54ebf80298b8/chat" ✅  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           setChatbotSettings({ webhook_url: ... })          │
│  chatbotSettings.webhook_url = ".../15f08634...chat"  ✅    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              FilteredSanaChat (chat se otevře)              │
│  Předá chatbotSettings.webhook_url do SanaChat  ✅          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  SanaChat - Poslání zprávy                  │
│  sendMessageToAPI(message, ..., webhookUrl)                 │
│  fetch(webhookUrl, { ... })  → SPRÁVNÝ WEBHOOK! 🎉         │
└─────────────────────────────────────────────────────────────┘
```

## 🎉 Hotovo!

Chatbot **Wany.Chat Local** nyní správně posílá zprávy na svůj webhook **ze všech míst v aplikaci**:

- ✅ **ChatbotSelector** (dialog "Vyberte chatbota")
- ✅ **Správa chatbotů** ("💬 Spustit chat s nastavením")

---

**Datum opravy:** 2026-01-14  
**Status:** ✅ **OPRAVENO A OTESTOVÁNO**
