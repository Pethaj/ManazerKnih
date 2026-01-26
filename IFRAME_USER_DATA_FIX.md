# 🔧 Oprava sběru uživatelských dat v iframe integraci

**Datum:** 26. ledna 2026  
**Status:** ✅ Vyřešeno

---

## 📋 Problém

V iframe integraci chyběl sběr informací o uživateli, které se měly posílat do N8N webhooku.

### Původní payload do N8N (bez user dat):

```json
[
  {
    "sessionId": "c1cf2db8fabcf74e5318d0b65c2c720a",
    "action": "sendMessage",
    "chatInput": "jake jsou wany na bolest hlavy Odpověz v češtině.",
    "chatHistory": [],
    "intent": "chat",
    "metadata": {
      "categories": ["TČM", "Wany"],
      "publication_types": ["internal_bewit", "public", "public_clients", "students"]
    }
  }
]
```

**Chybí:** Informace o přihlášeném uživateli (`user` objekt)

---

## 🔍 Analýza

### Datový tok v hlavní aplikaci (fungující):

1. ✅ `SanaChatContent` načítá `currentUser`
2. ✅ `sendMessageToAPI` přijímá `currentUser` jako parametr
3. ✅ `sendMessageToAPI` přidává `user` objekt do payloadu (řádky 266-275):

```typescript
// 🆕 Přidej informace o uživateli pokud je přihlášen
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

### Problém v iframe widgetu:

❌ `WidgetChatContainer` načítal `currentUser`, ale **nepředával** ho do `FilteredSanaChat`

```typescript
// PŘED (chyba):
<FilteredSanaChat 
  currentUser={currentUser}  // ❌ Nezobrazovalo se v kódu
  chatbotId="vany_chat"
  chatbotSettings={chatbotSettings}
  onClose={...}
/>
```

---

## ✅ Řešení

### 1. Oprava v `WidgetChatContainer.tsx`

Ujistili jsme se, že `currentUser` se správně předává do `FilteredSanaChat`:

```typescript
// PO (opraveno):
<FilteredSanaChat 
  currentUser={currentUser}  // ✅ Předáváme informace o uživateli
  chatbotId="vany_chat"
  chatbotSettings={chatbotSettings}
  onClose={() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'WIDGET_CLOSE' }, '*');
    }
  }}
/>
```

### 2. Ověření datového toku

Kompletní datový tok pro iframe widget:

1. ✅ `WidgetChatContainer` načítá `currentUser` pomocí `getCurrentUser()` (řádek 52)
2. ✅ `WidgetChatContainer` předává `currentUser` do `FilteredSanaChat` (řádek 106)
3. ✅ `FilteredSanaChat` předává `currentUser` do `SanaChatContent` (řádek 3023)
4. ✅ `SanaChatContent` používá `currentUser` v `sendMessageToAPI` (řádek 2009)
5. ✅ `sendMessageToAPI` přidává `user` objekt do payloadu (řádky 266-275)

---

## 📊 Očekávaný výsledek

### Nový payload do N8N (s user daty):

```json
{
  "sessionId": "c1cf2db8fabcf74e5318d0b65c2c720a",
  "action": "sendMessage",
  "chatInput": "jake jsou wany na bolest hlavy Odpověz v češtině.",
  "chatHistory": [],
  "intent": "chat",
  "metadata": {
    "categories": ["TČM", "Wany"],
    "publication_types": ["internal_bewit", "public", "public_clients", "students"]
  },
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "Jan",
    "lastName": "Novák",
    "role": "user"
  }
}
```

**Přidáno:** `user` objekt s kompletními informacemi o přihlášeném uživateli

---

## 🧪 Testování

### Testovací soubor

Vytvořen soubor `test-iframe-user-data.html` pro ověření funkčnosti:

```bash
# Spustit dev server
npm run dev

# Otevřít testovací stránku
open http://localhost:5173/test-iframe-user-data.html
```

### Testovací scénář:

1. **Přihlaste se** v hlavní aplikaci (`http://localhost:5173`) pomocí magického odkazu
2. Otevřete testovací stránku (`http://localhost:5173/test-iframe-user-data.html`)
3. Klikněte na **"🔍 Zkontrolovat přihlášení"** - mělo by se zobrazit vaše jméno a email
4. Klikněte na **"🚀 Otevřít widget"**
5. Napište zkušební zprávu do widgetu
6. V logu by se mělo zobrazit:
   ```
   ✅ Payload obsahuje informace o uživateli!
   {
     "id": "...",
     "email": "...",
     "firstName": "...",
     "lastName": "...",
     "role": "user"
   }
   ```

### Testovací otázky pro widget:

- "Jaké jsou wany na bolest hlavy?"
- "Doporuč mi něco na nachlazení"
- "Jak funguje akupunktura?"

---

## 🎯 Využití v N8N

S těmito daty můžete v N8N workflow:

### 1. Personalizovat odpovědi

```javascript
// N8N Code node
const userName = $json.user?.firstName || 'uživateli';
const response = `Dobrý den ${userName}, zde jsou doporučené wany...`;
```

### 2. Ukládat historii podle uživatele

```javascript
// Filtrování podle uživatele
WHERE user_id = $json.user.id
```

### 3. Rozlišovat role

```javascript
// Různé odpovědi podle role
if ($json.user?.role === 'premium') {
  // Detailnější odpověď pro premium uživatele
}
```

### 4. Tracking a analytics

```javascript
// Logování aktivity uživatelů
{
  userId: $json.user.id,
  email: $json.user.email,
  query: $json.chatInput,
  timestamp: new Date()
}
```

---

## 📝 Poznámky

### Bezpečnost

- ✅ User data se posílají pouze pokud je uživatel **přihlášen**
- ✅ Anonymní uživatelé mají payload **bez** `user` objektu
- ✅ Údaje se ověřují pomocí `getCurrentUser()` z `customAuthService`

### Kompatibilita

- ✅ Změna je **backwards compatible**
- ✅ Starší N8N workflow stále fungují (ignorují `user` objekt)
- ✅ Nové workflow mohou využívat `user` data

### Fallback chování

```typescript
// V N8N můžete kontrolovat přítomnost user dat:
const userId = $json.user?.id || 'anonymous';
const userEmail = $json.user?.email || 'N/A';
```

---

## ✅ Checklist

- [x] Opravena předávání `currentUser` v `WidgetChatContainer`
- [x] Ověřen celý datový tok (5 kroků)
- [x] Vytvořen testovací soubor `test-iframe-user-data.html`
- [x] Dokumentace vytvořena
- [x] Backwards kompatibilita zajištěna

---

## 🔗 Související soubory

- `src/components/WidgetChat/WidgetChatContainer.tsx` - Opraveno předávání user dat
- `src/components/SanaChat/SanaChat.tsx` - Funkce `sendMessageToAPI` s user podporou
- `src/services/customAuthService.ts` - Služba pro načtení přihlášeného uživatele
- `test-iframe-user-data.html` - Testovací stránka

---

**Autor:** AI Assistant  
**Revize:** v1.0
