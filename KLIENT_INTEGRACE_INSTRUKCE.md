# 🚀 Bewit Intelligence - Integrace obou chatbotů

## 📋 Co je nového?

### ✅ Opraveno:
- ❌ **STARÝ problém:** Data se posílala 2× nebo vůbec
- ✅ **NOVÉ řešení:** Jeden globální listener, automatická deduplikace, 100% spolehlivost

---

## 🔄 Co se změnilo oproti původnímu kódu?

### 1️⃣ PŘIDÁN: Globální IFRAME_READY listener

**NOVÝ KÓD** (vložit JEN JEDNOU na stránku, před oba chaty):

```javascript
<script>
(function() {
  const GR8_ORIGIN = 'https://gr8learn.eu';
  const sentTo = new WeakSet();

  window.addEventListener('message', function(event) {
    if (event.origin !== GR8_ORIGIN) return;
    if (!event.data || event.data.type !== 'IFRAME_READY') return;
    if (!event.source) return;
    if (sentTo.has(event.source)) return; // Deduplikace

    console.log('✅ IFRAME_READY přijato z chatu:', event.data.chatId);

    const userData = {
      type: 'USER_DATA',
      user: {
        id: CURRENT_USER.id || '',
        firstName: CURRENT_USER.firstName || '',
        lastName: CURRENT_USER.lastName || '',
        email: CURRENT_USER.email || '',
        position: CURRENT_USER.position || '',
        tokenEshop: CURRENT_USER.tokenEshop || ''
      }
    };

    event.source.postMessage(userData, event.origin);
    sentTo.add(event.source);
    
    console.log('📤 User data poslána do', event.data.chatId);
  });

  console.log('✅ Globální IFRAME_READY listener zaregistrován');
})();
</script>
```

**Co to dělá:**
- ✅ Poslouchá `IFRAME_READY` signál z obou chatů
- ✅ Odpovídá **přesně do toho iframe, které signál poslalo** (přes `event.source`)
- ✅ Deduplikuje - pošle data jen **1× do každého iframe**
- ✅ Rozpozná který chat to je (přes `event.data.chatId`)

---

### 2️⃣ ODSTRANĚNO: Automatické posílání na `iframe.load`

**❌ STARÝ KÓD** (tento blok **SMAZAT**):

```javascript
<script>
(function() {
  const iframe = document.getElementById('wany-chat-iframe');
  if (!iframe) return;
  iframe.addEventListener('load', function() {
    iframe.contentWindow.postMessage({
      type: 'USER_DATA',
      user: { /* ... */ }
    }, 'https://gr8learn.eu');
  });
})();
</script>
```

**Proč odstraněno:**
- ❌ `load` nastane **dřív než je React ready** → data se ztratí
- ❌ Posílá do `getElementById('...')` → může trefit špatný iframe
- ❌ Žádná deduplikace → může poslat 2×

---

### 3️⃣ BEZE ZMĚNY: Funkce open/close chatů

Tyto funkce zůstávají **úplně stejné**:
- `openWanyChat()` / `closeWanyChat()`
- `openEOSmesiChat()` / `closeEOSmesiChat()`
- ESC klávesa handling

**Žádná změna není potřeba!**

---

## 📊 Jak to funguje (krok za krokem)

```
1. Stránka se načte
   └─> CURRENT_USER se nastaví z PHP
   └─> Globální listener se zaregistruje

2. Iframe se načte (embed.html nebo embed-eo-smesi.html)
   └─> Early script pošle: { type: 'IFRAME_READY', chatId: 'wany_chat' }

3. Globální listener zachytí IFRAME_READY
   └─> Zkontroluje origin (https://gr8learn.eu)
   └─> Zkontroluje deduplikaci (WeakSet)
   └─> Pošle USER_DATA přes event.source

4. Iframe přijme USER_DATA
   └─> Early script uloží do window.__PENDING_USER_DATA__
   └─> React načte z cache a nastaví userContext
   └─> ✅ Data jsou v chatu!
```

---

## 🧪 Testování

### 1. Otevři konzoli (F12)

Měl bys vidět:

```
✅ Globální IFRAME_READY listener zaregistrován
✅ IFRAME_READY přijato z chatu: wany_chat
📤 User data poslána do wany_chat: { id: "123", email: "...", ... }
```

### 2. Otevři Wany Chat

Měl bys vidět v iframe konzoli:

```
🔥 ZPRÁVA: { type: "USER_DATA", user: {...} }
✅ DATA ZACHYCENA: { id: "123", ... }
✅ [WANY LISTENER] PostMessage PŘIJATA: https://mybewit.com
👤 [WANY LISTENER] User data: { id: "123", ... }
```

### 3. Pošli zprávu v chatu

Zkontroluj N8N webhook - měl by obsahovat:

```json
{
  "user": {
    "id": "123",
    "email": "jan@bewit.cz",
    "firstName": "Jan",
    "lastName": "Novák",
    "position": "Supervisor",
    "token_eshop": "abc123"
  }
}
```

---

## 🔒 Bezpečnost

### Origin check
```javascript
if (event.origin !== 'https://gr8learn.eu') return;
```

Listener přijímá zprávy **POUZE** z `https://gr8learn.eu`.

### Deduplikace
```javascript
const sentTo = new WeakSet();
if (sentTo.has(event.source)) return;
```

Data se pošlou **JEN JEDNOU** do každého iframe okna.

### event.source
```javascript
event.source.postMessage(userData, event.origin);
```

Posílá **PŘESNĚ** do toho iframe, které `IFRAME_READY` poslalo (ne podle ID).

---

## ✅ Checklist pro nasazení

- [ ] Vytvořil jsem `CURRENT_USER` objekt z PHP backendu
- [ ] Vložil jsem **globální IFRAME_READY listener** (JEN JEDNOU na stránku)
- [ ] **ODSTRANIL** jsem všechny `iframe.addEventListener('load', ...)` bloky
- [ ] Ponechal jsem `openWanyChat()` / `closeWanyChat()` funkce beze změn
- [ ] Ponechal jsem `openEOSmesiChat()` / `closeEOSmesiChat()` funkce beze změn
- [ ] Otestoval jsem v konzoli - vidím `✅ IFRAME_READY přijato`
- [ ] Otestoval jsem v chatu - user data jsou vyplněná
- [ ] Zkontroloval jsem N8N webhook - user data tam jsou

---

## 📦 Soubory

- **`KLIENT_INTEGRACE_OBA_CHATY.html`** - Kompletní kód pro copy-paste
- **`KLIENT_INTEGRACE_INSTRUKCE.md`** - Tento dokument (instrukce)

---

## ❓ FAQ

### Q: Musím měnit open/close funkce?
**A:** NE! Zůstávají úplně stejné.

### Q: Kde vložím globální listener?
**A:** Nejlépe hned po definici `CURRENT_USER`, před oba chaty.

### Q: Co když mám jen jeden chat?
**A:** Funguje to stejně! Listener je univerzální.

### Q: Pošlou se data 2× když otevřu a zavřu chat?
**A:** NE! `WeakSet` deduplikace zajistí, že se pošlou jen 1×.

### Q: Co když iframe pošle IFRAME_READY 2×?
**A:** Deduplikace to zachytí a data pošle jen jednou.

### Q: Musím něco měnit na gr8learn.eu?
**A:** NE! Změny už jsou hotové a nasazené.

---

## 🆘 Podpora

Pokud něco nefunguje:

1. **Zkontroluj konzoli** - hledej `✅ IFRAME_READY přijato`
2. **Zkontroluj iframe konzoli** - hledej `🔥 ZPRÁVA:` a `✅ DATA ZACHYCENA`
3. **Zkontroluj N8N webhook** - jsou tam user data?
4. **Pošli screenshot konzole** - parent i iframe

---

**🎉 Po implementaci bude user data integrace 100% spolehlivá!**

**Verze:** 2.0  
**Datum:** 2. února 2026  
**Status:** ✅ Production Ready
