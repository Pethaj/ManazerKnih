# ⚡ BEWIT - 2 ŘÁDKY K OPRAVĚ

## ❌ PROBLÉM:
User data se NEPROPISUJÍ do chatu → payload v N8N má prázdné user objekty

---

## ✅ ŘEŠENÍ - ZMĚNIT 2 ŘÁDKY:

### **ZMĚNA 1: Target origin**

**Najdi řádek:**
```javascript
iframe.contentWindow.postMessage(userData, 'https://gr8learn.eu');
```

**Změň na:**
```javascript
iframe.contentWindow.postMessage(userData, '*');
```

---

### **ZMĚNA 2: Čekej na IFRAME_READY**

**Najdi:**
```javascript
setTimeout(() => {
  this.sendUserDataToIframe();
}, 300);
```

**Změň na:**
```javascript
// NIC - odstraň tento setTimeout!
```

**A přidej do componentDidMount:**
```javascript
componentDidMount() {
  // ✅ PŘIDEJ TOHLE:
  this.handleIframeReady = (event) => {
    if (event.data && event.data.type === 'IFRAME_READY') {
      console.log('✅ Iframe ready, posílám data...');
      this.sendUserDataToIframe();
    }
  };
  
  window.addEventListener('message', this.handleIframeReady);
  
  // ... zbytek kódu
}
```

---

## 🧪 JAK POZNAT ŽE TO FUNGUJE:

Po úpravách **MUSÍŠ VIDĚT** v konzoli:

```
1. 📤 Odesílám IFRAME_READY signál...
2. ✅ IFRAME_READY signál odeslán
3. ✅ Iframe ready, posílám data...
4. User data sent to iframe: {type: 'USER_DATA', user: {...}}
5. 📨 PostMessage přijata: ...
6. ✅ PostMessage PŘIJATA z důvěryhodného originu
7. 👤 User data: { id: 170107, ... }
```

**A v N8N payloadu:**
```json
{
  "user": {
    "id": "170107",          // ✅ VYPLNĚNÉ!
    "email": "petr@bewit...",
    "firstName": "Petr",
    "lastName": "Hajduk"
  }
}
```

---

## ⏱️ ČAS IMPLEMENTACE: 5 MINUT

1. **Změň** `'https://gr8learn.eu'` na `'*'`
2. **Odstraň** `setTimeout(..., 300)`
3. **Přidej** `handleIframeReady` listener
4. **Otestuj** - hard refresh (Ctrl+Shift+R)
5. **Zkontroluj** konzoli - vidíš 7 logů výše?
6. **Zkontroluj** N8N - user data vyplněná?

---

## 🆘 POKUD NEFUNGUJE:

Pošli screenshot konzole s CELÝMI logy (od otevření chatu).

---

**Po těchto 2 změnách bude vše 100% funkční!** 🎉
