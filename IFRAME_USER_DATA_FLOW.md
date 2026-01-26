# 🔄 Datový tok - User data v iframe widgetu

Vizualizace toku uživatelských dat od načtení widgetu až po N8N webhook.

---

## 📊 Kompletní datový tok

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. IFRAME WIDGET NAČTENÍ                                        │
│    File: public/widgets/widget-chat.html                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        iframe načte React aplikaci
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. WIDGET CONTAINER INICIALIZACE                                │
│    File: src/components/WidgetChat/WidgetChatContainer.tsx      │
│    Line: 34-76                                                  │
├─────────────────────────────────────────────────────────────────┤
│    initializeWidget() {                                         │
│      // Načte config z URL                                      │
│      const config = getWidgetConfigFromURL()                    │
│                                                                  │
│      // ✅ NAČTE PŘIHLÁŠENÉHO UŽIVATELE                         │
│      const { user } = await getCurrentUser()  // řádek 52       │
│      setCurrentUser(user)                                       │
│                                                                  │
│      // Načte chatbot settings                                  │
│      const settings = await getChatbotSettings('vany_chat')     │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
            currentUser předán do komponenty
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FILTERED SANA CHAT                                           │
│    File: src/components/SanaChat/SanaChat.tsx                   │
│    Line: 2630-3036 (komponenta FilteredSanaChat)                │
├─────────────────────────────────────────────────────────────────┤
│    <FilteredSanaChat                                            │
│      currentUser={currentUser}  ← ✅ přijímá user data          │
│      chatbotId="vany_chat"                                      │
│      chatbotSettings={settings}                                 │
│      onClose={...}                                              │
│    />                                                            │
│                                                                  │
│    ↓ Předává dál do...                                          │
│                                                                  │
│    <SanaChatContent                                             │
│      currentUser={currentUser}  ← ✅ předává user data          │
│      selectedCategories={...}                                   │
│      chatbotSettings={settings}                                 │
│      chatbotId={chatbotId}                                      │
│    />                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        uživatel napíše zprávu v chatu
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SANA CHAT CONTENT - ZPRACOVÁNÍ ZPRÁVY                        │
│    File: src/components/SanaChat/SanaChat.tsx                   │
│    Line: 1538-2603 (komponenta SanaChatContent)                 │
├─────────────────────────────────────────────────────────────────┤
│    handleSendMessage(text) {                                    │
│      // Vytvoří user message                                    │
│      const userMessage = { role: 'user', text: text }           │
│                                                                  │
│      // ✅ VOLÁ API S USER DATY                                 │
│      const result = await sendMessageToAPI(                     │
│        promptForBackend,                                        │
│        sessionId,                                               │
│        messages,                                                │
│        currentMetadata,                                         │
│        chatbotSettings.webhook_url,                             │
│        chatbotId,                                               │
│        undefined,  // intent                                    │
│        undefined,  // detectedSymptoms                          │
│        currentUser ← ✅ PŘEDÁVÁ USER DATA! (řádek 2009)         │
│      )                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
              volá sendMessageToAPI funkci
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SEND MESSAGE TO API - PŘÍPRAVA PAYLOADU                      │
│    File: src/components/SanaChat/SanaChat.tsx                   │
│    Line: 233-420 (funkce sendMessageToAPI)                      │
├─────────────────────────────────────────────────────────────────┤
│    sendMessageToAPI(                                            │
│      message,                                                   │
│      sessionId,                                                 │
│      history,                                                   │
│      metadata,                                                  │
│      webhookUrl,                                                │
│      chatbotId,                                                 │
│      intent,                                                    │
│      detectedSymptoms,                                          │
│      currentUser ← ✅ PŘIJÍMÁ USER DATA                         │
│    ) {                                                           │
│      // Vytvoří základní payload                                │
│      const payload = {                                          │
│        sessionId: sessionId,                                    │
│        action: "sendMessage",                                   │
│        chatInput: message,                                      │
│        chatHistory: history,                                    │
│        intent: intent || 'chat'                                 │
│      }                                                           │
│                                                                  │
│      // Přidá metadata                                          │
│      if (metadata) {                                            │
│        payload.metadata = metadata                              │
│      }                                                           │
│                                                                  │
│      // ✅ PŘIDÁ USER DATA DO PAYLOADU!                         │
│      if (currentUser) {                   // řádek 267          │
│        payload.user = {                                         │
│          id: currentUser.id,                                    │
│          email: currentUser.email,                              │
│          firstName: currentUser.firstName,                      │
│          lastName: currentUser.lastName,                        │
│          role: currentUser.role                                 │
│        }                                                         │
│      }                                                           │
│                                                                  │
│      // Odešle do N8N                                           │
│      const response = await fetch(webhookUrl, {                 │
│        method: 'POST',                                          │
│        headers: { 'Content-Type': 'application/json' },         │
│        body: JSON.stringify(payload)                            │
│      })                                                          │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
            HTTP POST request na N8N webhook
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. N8N WEBHOOK PŘIJME DATA                                      │
│    URL: https://n8n.srv980546.hstgr.cloud/webhook/...          │
├─────────────────────────────────────────────────────────────────┤
│    Payload obsahuje:                                            │
│    {                                                             │
│      "sessionId": "c1cf2db8fabcf74e5318d0b65c2c720a",          │
│      "action": "sendMessage",                                   │
│      "chatInput": "jake jsou wany na bolest hlavy?",           │
│      "chatHistory": [...],                                      │
│      "intent": "chat",                                          │
│      "metadata": {                                              │
│        "categories": ["TČM", "Wany"],                           │
│        "publication_types": ["internal_bewit", "public"]        │
│      },                                                          │
│      "user": { ← ✅ USER DATA DOSTUPNÁ V N8N!                   │
│        "id": "550e8400-e29b-41d4-a716-446655440000",           │
│        "email": "jan.novak@example.com",                       │
│        "firstName": "Jan",                                      │
│        "lastName": "Novák",                                     │
│        "role": "user"                                           │
│      }                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
              N8N workflow zpracuje data
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. N8N WORKFLOW - POUŽITÍ USER DAT                              │
├─────────────────────────────────────────────────────────────────┤
│    • Personalizace: "Dobrý den {{ $json.user.firstName }}"     │
│    • Ukládání: user_id = $json.user.id                         │
│    • Role-based: if ($json.user.role === 'admin')              │
│    • Email: $json.user.email pro notifikace                    │
│    • Analytics: tracking podle user ID                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Klíčové body

### 1. Načtení uživatele (řádek 52)
```typescript
const { user } = await getCurrentUser();
```
- Používá `customAuthService`
- Kontroluje localStorage/session
- Vrací `null` pokud není přihlášen

### 2. Předávání mezi komponentami
```typescript
WidgetChatContainer → FilteredSanaChat → SanaChatContent → sendMessageToAPI
```
- Vždy předává `currentUser` prop
- TypeScript type: `User | null`

### 3. Přidání do payloadu (řádky 266-275)
```typescript
if (currentUser) {
  payload.user = {
    id: currentUser.id,
    email: currentUser.email,
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    role: currentUser.role
  };
}
```
- Pouze pokud je uživatel přihlášen
- Optional - anonymní návštěvníci nemají `user` objekt

---

## 📈 Srovnání s hlavní aplikací

### Hlavní aplikace (funguje stejně)

```
App.tsx
  ↓ načte currentUser
ChatWidget.tsx
  ↓ předá currentUser
FilteredSanaChat
  ↓ předá currentUser
SanaChatContent
  ↓ předá currentUser
sendMessageToAPI
  ↓ přidá do payloadu
N8N webhook
```

### Iframe widget (nyní funguje stejně)

```
widget-chat.html
  ↓ načte React
WidgetChatContainer
  ↓ načte currentUser ✅ OPRAVENO
FilteredSanaChat
  ↓ předá currentUser
SanaChatContent
  ↓ předá currentUser
sendMessageToAPI
  ↓ přidá do payloadu
N8N webhook
```

---

## 🔒 Bezpečnostní kontroly

### Na každé úrovni:

1. **WidgetChatContainer** (řádek 52-58)
   ```typescript
   if (user) {
     setCurrentUser(user);
     widgetLog('✅ Přihlášený uživatel:', user.email);
   } else {
     widgetLog('ℹ️ Žádný přihlášený uživatel');
   }
   ```

2. **FilteredSanaChat** (řádek 2631)
   ```typescript
   currentUser?: User;  // Optional prop
   ```

3. **SanaChatContent** (řádek 1539)
   ```typescript
   currentUser?: User;  // Optional prop
   ```

4. **sendMessageToAPI** (řádek 242, 267)
   ```typescript
   currentUser?: User  // Optional parametr
   
   if (currentUser) {  // Kontrola před použitím
     payload.user = { ... }
   }
   ```

---

## 🧪 Testovací body

Kontrolní body pro testování toku:

| # | Místo | Co testovat | Očekávaný výsledek |
|---|-------|-------------|-------------------|
| 1 | Browser Console | `widgetLog` výpisy | "✅ Přihlášený uživatel: email" |
| 2 | React DevTools | `WidgetChatContainer` state | `currentUser` obsahuje data |
| 3 | React DevTools | `FilteredSanaChat` props | `currentUser` prop předán |
| 4 | React DevTools | `SanaChatContent` props | `currentUser` prop předán |
| 5 | Network Tab | Payload v request | `user` objekt přítomen |
| 6 | N8N Workflow | `$json.user` | Data dostupná v N8N |

---

## 💡 Tipy pro debugging

### 1. Console logy

```typescript
// V WidgetChatContainer
console.log('📍 WidgetChatContainer - currentUser:', currentUser);

// V FilteredSanaChat
console.log('📍 FilteredSanaChat - currentUser:', currentUser);

// V SanaChatContent
console.log('📍 SanaChatContent - currentUser:', currentUser);

// V sendMessageToAPI
console.log('📍 sendMessageToAPI - currentUser:', currentUser);
console.log('📍 sendMessageToAPI - payload:', payload);
```

### 2. React DevTools

Zkontrolujte props každé komponenty:
- `WidgetChatContainer` → state `currentUser`
- `FilteredSanaChat` → props `currentUser`
- `SanaChatContent` → props `currentUser`

### 3. Network Tab

Zkontrolujte payload v request na N8N:
- Otevřete DevTools → Network
- Filtr: XHR
- Najděte request na `n8n.srv980546.hstgr.cloud`
- Zkontrolujte Request Payload → `user` objekt

---

## ✅ Checklist funkčnosti

Pro ověření, že vše funguje správně:

- [ ] Iframe se načte bez chyby
- [ ] Console log ukazuje "✅ Přihlášený uživatel"
- [ ] `currentUser` state obsahuje data
- [ ] Props se předávají mezi komponentami
- [ ] Network request obsahuje `user` objekt
- [ ] N8N workflow přijímá `$json.user` data
- [ ] Personalizace v N8N funguje

---

**Vytvořeno:** 26. ledna 2026  
**Účel:** Dokumentace datového toku pro user data v iframe widgetu
