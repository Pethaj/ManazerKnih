# 🔧 localStorage User Data Fix

## 🎯 Problém

User data z klientské integrace se **posílala správně přes postMessage**, ale **nepropagovala se do webhook payloadů a Supabase**.

**Console log potvrzoval:**
```
User data sent to eo-smesi-chat: {type: 'USER_DATA', user: {…}}
```

Ale pak:
```
🔍 USER DATA DIAGNOSTIKA:
  - externalUserInfo: undefined
  - currentUser: undefined
  - payload.user po sestavení: {id: '', email: '', ...} ← PRÁZDNÉ!
```

---

## ✅ Řešení: localStorage Bridge

Data z `postMessage` se **okamžitě ukládají do localStorage** a odtamtud se čtou při:
1. Odesílání na N8N webhook
2. Ukládání do Supabase `chat_messages`

### Proč localStorage?
- ✅ **Synchronní** - data jsou okamžitě dostupná
- ✅ **Nezávislé na React state** - funguje i když komponenty selžou
- ✅ **Perzistentní** - data zůstanou i po refresh (dokud nejsou přepsána)
- ✅ **Debugovatelné** - `localStorage.getItem('BEWIT_USER_DATA')` v konzoli

---

## 📝 Změny v kódu

### 1️⃣ **EmbedVanyChat.tsx** (řádek ~161)

**Přidáno:** Ukládání do localStorage při příjmu postMessage

```typescript
const handleMessage = (event: MessageEvent) => {
  if (event.data.type === 'USER_DATA' && event.data.user) {
    console.log('✅ [WANY LISTENER] PostMessage PŘIJATA:', event.origin);
    
    // 💾 NOVÉ: Uložit do localStorage
    try {
      localStorage.setItem('BEWIT_USER_DATA', JSON.stringify(event.data.user));
      console.log('💾 User data uložena do localStorage');
    } catch (e) {
      console.error('❌ Chyba při ukládání do localStorage:', e);
    }
    
    setUserContext({...}); // Původní logika
  }
};
```

---

### 2️⃣ **EmbedEOSmesi.tsx** (řádek ~161)

**Stejná změna** jako v EmbedVanyChat.tsx

---

### 3️⃣ **SanaChat.tsx** (řádek ~292)

**Přidáno:** Čtení z localStorage před odesláním na webhook

```typescript
// 💾 NOVÉ: Načti data z localStorage
let localStorageUser = null;
try {
  const stored = localStorage.getItem('BEWIT_USER_DATA');
  if (stored) {
    localStorageUser = JSON.parse(stored);
    console.log('💾 User data načtena z localStorage:', localStorageUser);
  }
} catch (e) {
  console.warn('⚠️ Nepodařilo se načíst user data z localStorage:', e);
}

// ✅ PRIORITA: localStorage > externalUserInfo > currentUser > prázdné
payload.user = localStorageUser ? {
  id: String(localStorageUser.id || ""),
  email: localStorageUser.email || "",
  firstName: localStorageUser.firstName || "",
  lastName: localStorageUser.lastName || "",
  role: localStorageUser.position || "",
  tokenEshop: localStorageUser.tokenEshop || ""
} : externalUserInfo ? {
  // Původní fallback
  ...
} : ...;
```

---

### 4️⃣ **chatHistoryService.ts** (řádek ~329)

**Přidáno:** Čtení z localStorage před uložením do Supabase

```typescript
// 🆕 User info - PRIORITA: localStorage > answerData.user_info
let finalUserInfo = null;

// 💾 NOVÉ: Zkus načíst z localStorage
try {
  const stored = localStorage.getItem('BEWIT_USER_DATA');
  if (stored) {
    const parsed = JSON.parse(stored);
    finalUserInfo = {
      external_user_id: String(parsed.id || ''),
      first_name: parsed.firstName || '',
      last_name: parsed.lastName || '',
      email: parsed.email || '',
      position: parsed.position || '',
      token_eshop: parsed.tokenEshop || ''
    };
    console.log('💾 [ChatHistory] User info načtena z localStorage:', finalUserInfo);
  }
} catch (e) {
  console.warn('⚠️ [ChatHistory] Nepodařilo se načíst z localStorage:', e);
}

// Fallback na answerData.user_info (původní logika)
if (!finalUserInfo && answerData?.user_info) {
  finalUserInfo = answerData.user_info;
}

// Uložíme do user_data sloupce
if (finalUserInfo) {
  dataToSave.user_data = finalUserInfo;
}
```

---

## 🔍 Debugging

### Zkontrolovat data v konzoli:

```javascript
// V browser DevTools Console:
JSON.parse(localStorage.getItem('BEWIT_USER_DATA'))
```

**Mělo by vrátit:**
```json
{
  "id": 170107,
  "firstName": "Petr",
  "lastName": "Hajduk",
  "email": "petr.hajduk@bewit.team",
  "position": "Supervisor",
  "tokenEshop": "..."
}
```

### Očekávané console logy:

**Po otevření chatu:**
```
✅ [WANY LISTENER] PostMessage PŘIJATA: https://...
💾 User data uložena do localStorage
```

**Při odesílání zprávy:**
```
💾 User data načtena z localStorage: {id: 170107, ...}
📤 payload.user po sestavení: {id: "170107", email: "...", ...}
```

**Při ukládání do Supabase:**
```
💾 [ChatHistory] User info načtena z localStorage: {...}
🔍 [ChatHistory] Ukládám user_info do user_data sloupce: {...}
✅ [ChatHistory] Pár otázka-odpověď úspěšně uložen
```

---

## ✅ Co to řeší

1. ✅ **User data se NYNÍ POSÍLAJÍ do N8N webhooku** v payload.user
2. ✅ **User data se NYNÍ UKLÁDAJÍ do Supabase** v chat_messages.user_data
3. ✅ **Klient NEMUSÍ NIC MĚNIT** - jeho integrace zůstává stejná
4. ✅ **Funguje i bez React state** - localStorage je nezávislý fallback

---

## 🚀 Deployment

### Co udělat:

1. ✅ Commitnout změny
2. ✅ Pushnout na main
3. ✅ Netlify auto-deploy (nebo manuální build)
4. ✅ Otestovat na produkci:
   - Otevřít chat u klienta
   - Zkontrolovat console log
   - Poslat zprávu
   - Zkontrolovat Supabase tabulku `chat_messages`
   - Zkontrolovat N8N workflow logs

### Rollback plán:

Pokud by localStorage nefungoval:
- Data mají fallback na původní `externalUserInfo` systém
- Systém nezhavaruje, jen user_data budou prázdné (jako předtím)

---

## 📊 Testovací checklist

- [ ] Console log ukazuje "💾 User data uložena do localStorage"
- [ ] Console log ukazuje "💾 User data načtena z localStorage"
- [ ] Webhook payload obsahuje vyplněné `user.id`, `user.email`, atd.
- [ ] Supabase `chat_messages.user_data` obsahuje data (SELECT query)
- [ ] Data přetrvávají i po refresh stránky
- [ ] Funguje pro oba chaty (Wany + EO Směsi)

---

**Vytvořeno:** 2026-02-02  
**Status:** ✅ Implementováno, čeká na test
