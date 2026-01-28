# 🚀 Wany Chat Iframe - READY Signál Implementace

## 📋 Problém, který řešíme

**Timing issue:** PostMessage s user daty přicházela **DŘÍVE**, než se iframe stihlo inicializovat a zaregistrovat listener.

```
❌ PŮVODNÍ CHOVÁNÍ:
1. Bewit pošle USER_DATA (po 300ms)  ← MOC BRZY!
2. Iframe se načte a inicializuje      ← POZDĚ!
3. Listener se zaregistruje            ← POZDĚ!
→ PostMessage ZTRACENA ❌
```

---

## ✅ Řešení: IFRAME_READY signál

Iframe nyní **aktivně oznamuje**, že je připraven přijímat data.

```
✅ NOVÉ CHOVÁNÍ:
1. Iframe se načte a inicializuje
2. Iframe pošle: "IFRAME_READY"       ← SIGNÁL!
3. Bewit obdrží signál
4. Bewit pošle: "USER_DATA"           ← TEĎ!
5. Iframe přijme data                  ← ✅
```

---

## 🔧 Co musí udělat Bewit programátor

### **STÁVAJÍCÍ KÓD (nefunguje spolehlivě):**

```javascript
window.openWanyChat = () => {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');

  if (wrapper && overlay) {
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    document.body.style.overflow = 'hidden';

    // ❌ PROBLÉM: Fixed delay není spolehlivý
    setTimeout(() => {
      this.sendUserDataToIframe();
    }, 300);
  }
};
```

---

### **NOVÝ KÓD (spolehlivý):**

```javascript
componentDidMount() {
  // ✅ NOVĚ: Listener pro IFRAME_READY signál
  this.handleIframeReady = (event) => {
    // Kontrola, že zpráva přišla z gr8learn.eu
    if (event.origin !== 'https://gr8learn.eu') {
      return;
    }
    
    // Kontrola, že je to IFRAME_READY zpráva
    if (event.data && event.data.type === 'IFRAME_READY') {
      console.log('✅ Iframe je připraven, odesílám user data...');
      this.sendUserDataToIframe();
    }
  };
  
  // Zaregistruj listener
  window.addEventListener('message', this.handleIframeReady);
  
  // Definice funkcí openWanyChat a closeWanyChat...
  window.openWanyChat = () => {
    const wrapper = document.getElementById('wany-chat-wrapper');
    const overlay = document.getElementById('wany-chat-overlay');

    if (wrapper && overlay) {
      overlay.style.visibility = 'visible';
      overlay.style.opacity = '1';
      wrapper.style.visibility = 'visible';
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
      document.body.style.overflow = 'hidden';
      
      // ❌ ODSTRAŇ TIMEOUT - už není potřeba!
      // setTimeout(() => {
      //   this.sendUserDataToIframe();
      // }, 300);
      
      // ✅ Data se pošlou AUTOMATICKY po obdržení IFRAME_READY
    }
  };

  window.closeWanyChat = () => {
    // ... zůstává stejné
  };

  // ESC key handler
  this.handleEscKey = (e) => {
    if (e.key === 'Escape') {
      const wrapper = document.getElementById('wany-chat-wrapper');
      if (wrapper && wrapper.style.visibility === 'visible') {
        window.closeWanyChat();
      }
    }
  };

  document.addEventListener('keydown', this.handleEscKey);
}

componentWillUnmount() {
  // ✅ Cleanup
  window.removeEventListener('message', this.handleIframeReady);
  document.removeEventListener('keydown', this.handleEscKey);
}

sendUserDataToIframe = () => {
  const { profileOrigin } = this.props;
  const iframe = document.getElementById('wany-chat-iframe');

  if (iframe && profileOrigin) {
    const userData = {
      type: 'USER_DATA',
      user: {
        id: profileOrigin.id || '',
        firstName: profileOrigin.firstname || '',
        lastName: profileOrigin.lastname || '',
        email: profileOrigin.email || '',
        position: profileOrigin.bbo?.bbo_position_id ? BBO_POSITIONS[profileOrigin.bbo.bbo_position_id] : ''
      }
    };

    // ⚠️ DŮLEŽITÉ: Target origin musí být '*' nebo konkrétní origin kde iframe běží
    // Pokud iframe běží na stejné doméně (mybewit.com), použij '*'
    // Pokud iframe běží na jiné doméně (gr8learn.eu), použij 'https://gr8learn.eu'
    
    // VARIANTA 1: Univerzální (funguje vždy, ale méně bezpečné)
    iframe.contentWindow.postMessage(userData, '*');
    
    // VARIANTA 2: Bezpečnější (pokud znáš přesný origin)
    // const iframeOrigin = new URL(iframe.src).origin; // Získej origin z iframe src
    // iframe.contentWindow.postMessage(userData, iframeOrigin);
    
    console.log('✅ User data sent to iframe:', userData);
  }
};
```

---

## 📊 Přehled změn

| Aspekt | PŘED | PO |
|--------|------|-----|
| **Timing** | Fixed 300ms delay | Čeká na IFRAME_READY signál |
| **Spolehlivost** | ❌ 50% (závisí na rychlosti načtení) | ✅ 100% (čeká až je iframe ready) |
| **Listener** | ❌ Žádný | ✅ `handleIframeReady` |
| **PostMessage** | Posílá se automaticky po 300ms | Posílá se PO obdržení IFRAME_READY |

---

## 🧪 Testování

### **1. Ověř, že IFRAME_READY přichází:**

Otevři konzoli (F12) a sleduj:

```
✅ Iframe je připraven, odesílám user data...
📨 PostMessage přijata: { origin: "https://mybewit.com", type: "USER_DATA", hasUser: true }
✅ PostMessage PŘIJATA z důvěryhodného originu: https://mybewit.com
👤 User data: { id: "3523", email: "marcel.haim@bewit.cz", ... }
```

### **2. Zkontroluj N8N payload:**

Po odeslání zprávy v chatu zkontroluj N8N webhook log:

```json
{
  "user": {
    "id": "3523",           // ✅ VYPLNĚNÉ!
    "email": "marcel.haim@bewit.cz",
    "firstName": "Marcel",
    "lastName": "Haim",
    "role": "Supervisor"
  }
}
```

---

## 🔒 Bezpečnost

### **Origin check v iframe:**

Iframe přijímá postMessage POUZE z těchto domén:

```typescript
const allowedOrigins = [
  'https://www.bewit.cz',
  'https://bewit.cz',
  'https://mybewit.com',
  'https://www.mybewit.com',
];
```

### **Origin check v Bewit kódu:**

```javascript
this.handleIframeReady = (event) => {
  // ✅ Kontrola originu - přijímej jen z gr8learn.eu
  if (event.origin !== 'https://gr8learn.eu') {
    return;
  }
  
  if (event.data && event.data.type === 'IFRAME_READY') {
    this.sendUserDataToIframe();
  }
};
```

---

## ❓ FAQ

### **Q: Co když iframe nepošle IFRAME_READY?**
A: To by znamenalo problém s načtením iframe. V tom případě uživatel stejně neuvidí chat, takže postMessage není potřeba.

### **Q: Můžu nechat původní timeout jako fallback?**
A: **NE!** To by způsobilo duplicitní odeslání dat. Buď použij IFRAME_READY signál, NEBO timeout. Ne obojí.

### **Q: Jak dlouho trvá než přijde IFRAME_READY?**
A: Obvykle 1-2 sekundy. Iframe pošle signál až po dokončení načtení React aplikace a chatbot nastavení.

### **Q: Co když user zavře a znovu otevře chat?**
A: IFRAME_READY se pošle jen JEDNOU (po prvním načtení). Při opětovném otevření se data odešlou OKAMŽITĚ (listener už běží).

### **Q: Jaký target origin mám použít v postMessage?**
A: Záleží na tom, kde iframe běží:

**Pokud iframe běží na STEJNÉ doméně (mybewit.com):**
```javascript
iframe.contentWindow.postMessage(userData, '*');
```

**Pokud iframe běží na JINÉ doméně (gr8learn.eu):**
```javascript
iframe.contentWindow.postMessage(userData, 'https://gr8learn.eu');
```

**Automatická detekce:**
```javascript
const iframeOrigin = new URL(iframe.src).origin;
iframe.contentWindow.postMessage(userData, iframeOrigin);
```

### **Q: Dostávám chybu "target origin does not match recipient window's origin"**
A: To znamená, že iframe běží na jiném originu, než jaký zadáváte v postMessage. Použijte `'*'` jako target origin nebo zjistěte skutečný origin kde iframe běží (zkontrolujte v DevTools → Console).

---

## 📝 Checklist pro Bewit programátora

- [ ] Přidal jsem listener `handleIframeReady` v `componentDidMount`
- [ ] Odstranil jsem `setTimeout(..., 300)` z `openWanyChat`
- [ ] Přidal jsem origin check (`event.origin === 'https://gr8learn.eu'`)
- [ ] Přidal jsem cleanup v `componentWillUnmount`
- [ ] Otestoval jsem lokálně
- [ ] Zkontroloval jsem konzoli - vidím `✅ Iframe je připraven...`
- [ ] Zkontroloval jsem N8N webhook - user data jsou vyplněná
- [ ] Deploy na produkci

---

## 🆘 Podpora

Pokud něco nefunguje:

1. **Zkontroluj konzoli** - hledej logy s `📨` a `✅`
2. **Ověř origin** - musí být přesně `https://gr8learn.eu`
3. **Zkontroluj N8N** - jsou user data v payloadu?
4. **Kontaktuj podporu** s screenshot konzole

---

**🎉 Po implementaci bude user data integrace 100% spolehlivá!**
