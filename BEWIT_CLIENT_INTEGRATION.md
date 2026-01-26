# 🚀 Wany Chat - Integrace na Bewit web s user tracking

## 📋 Přehled

Tento průvodce popisuje jak integrovat Wany Chat na **Bewit web** s automatickým sledováním uživatelů přes **postMessage API**.

### Jak to funguje:

1. **Iframe se načte** bez URL parametrů (jednoduchá integrace)
2. **Bewit web pošle user data** do iframe přes JavaScript (postMessage)
3. **Iframe přijme data** a použije je v N8N payloadu
4. **N8N dostane vždy stejnou strukturu** jako od Wany.chat

---

## 🎯 Implementace na Bewit webu

### Krok 1: Získat user data z backendu

```php
<!-- V Blade template nebo PHP -->
<script>
const CURRENT_USER = {
    id: '<?php echo $user->id; ?>',
    email: '<?php echo $user->email; ?>',
    firstName: '<?php echo $user->firstName; ?>',
    lastName: '<?php echo $user->lastName; ?>'
};
</script>
```

### Krok 2: Widget HTML (téměř beze změn)

**JEDINÁ ZMĚNA:** Přidej `id="wany-chat-iframe"` do iframe elementu.

```html
<!-- Iframe (přidej id="wany-chat-iframe") -->
<iframe
  id="wany-chat-iframe"
  src="https://gr8learn.eu/embed.html"
  style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>
```

### Krok 3: Upravit JavaScript funkci openWanyChat()

**JEDINÁ ZMĚNA:** Přidej `postMessage` volání pro poslání user dat.

```javascript
function openWanyChat() {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');
  const iframe = document.getElementById('wany-chat-iframe');
  
  if (wrapper && overlay && iframe) {
    // Zobraz modal
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    document.body.style.overflow = 'hidden';
    
    // 🆕 Pošli user data do iframe
    setTimeout(() => {
      iframe.contentWindow.postMessage({
        type: 'WANY_USER_DATA',
        user: CURRENT_USER
      }, 'https://gr8learn.eu');
      console.log('📤 User data poslána do iframe');
    }, 500);
  }
}
```

---

## 📊 Co se posílá do N8N?

### BEZ user dat (iframe bez postMessage):
```json
{
  "sessionId": "...",
  "chatInput": "Jaké wany máte?",
  "chatHistory": [],
  "metadata": {...},
  "user": {
    "id": "",
    "email": "",
    "firstName": "",
    "lastName": ""
  }
}
```

### S user daty (po postMessage):
```json
{
  "sessionId": "...",
  "chatInput": "Jaké wany máte?",
  "chatHistory": [],
  "metadata": {...},
  "user": {
    "id": "12345",
    "email": "jan.novak@bewit.cz",
    "firstName": "Jan",
    "lastName": "Novák"
  }
}
```

---

## 🧪 Testování

### Lokální test:

1. **Spusť dev server:**
   ```bash
   npm run dev
   ```

2. **Otevři testovací stránku:**
   ```
   http://localhost:5173/public/widgets/test-bewit-client.html
   ```

3. **Testuj:**
   - Klikni "🚀 Spustit Chat"
   - Otevři Developer Tools (F12) → Console
   - Uvidíš: "📤 User data poslána do iframe"
   - Pošli zprávu do chatu
   - V Network tabu sleduj N8N request → mělo by tam být pole "user" s daty

### Produkční test:

Po nasazení na https://gr8learn.eu:

1. Změň v postMessage URL z `http://localhost:5173` na `https://gr8learn.eu`
2. Otevři chat na Bewit webu
3. Pošli testovací zprávu
4. Zkontroluj N8N webhook - měla by tam být user data

---

## ✅ Co se NEZMĚNILO na Bewit webu:

- ❌ HTML dlaždice (stejná)
- ❌ Overlay pozadí (stejný)
- ❌ Modal wrapper (stejný)
- ❌ Zavírací křížek (stejný)
- ❌ `closeWanyChat()` funkce (stejná)
- ❌ ESC klávesa handling (stejné)
- ❌ Responsivní CSS (stejné)

## ✅ Co se ZMĚNILO:

1. **Přidáno ID do iframe:** `id="wany-chat-iframe"`
2. **Přidán postMessage do `openWanyChat()`:** 3 řádky kódu
3. **To je všechno!**

---

## 🔒 Bezpečnost

### postMessage origin:

V produkci by měl být origin specifický:

```javascript
// Místo '*' (všechny originy)
iframe.contentWindow.postMessage({...}, '*');

// Použij konkrétní origin
iframe.contentWindow.postMessage({...}, 'https://gr8learn.eu');
```

### iframe přijímá pouze zprávy typu 'WANY_USER_DATA':

```javascript
// V EmbedVanyChat.tsx
if (event.data.type === 'WANY_USER_DATA' && event.data.user) {
  // Přijme data
}
```

---

## 🎉 Výsledek

Po implementaci:
- ✅ Iframe funguje úplně stejně jako dříve
- ✅ N8N dostává vždy pole "user" (prázdné nebo plné)
- ✅ Bewit web má plnou kontrolu nad user daty
- ✅ Žádné URL parametry (čistší řešení)
- ✅ Minimální změny na straně klienta (2 změny)

---

## 📞 Podpora

Pro technickou podporu:
- **Email:** podpora@bewit.love
- **Test stránka:** http://localhost:5173/public/widgets/test-bewit-client.html
