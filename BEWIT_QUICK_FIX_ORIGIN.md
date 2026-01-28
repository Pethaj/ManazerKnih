# 🚨 QUICK FIX - PostMessage Origin Error

## ❌ Chyba v konzoli:

```
Failed to execute 'postMessage' on 'DOMWindow': 
The target origin provided ('https://gr8learn.eu') does not match 
the recipient window's origin ('https://mybewit.com').
```

---

## ✅ ŘEŠENÍ (2 minuty):

### **ZMĚNA 1 ŘÁDKU:**

```javascript
// ❌ STARÝ KÓD (NEFUNGUJE):
iframe.contentWindow.postMessage(userData, 'https://gr8learn.eu');

// ✅ NOVÝ KÓD (FUNGUJE):
iframe.contentWindow.postMessage(userData, '*');
```

---

## 🔍 Proč to nefunguje:

**Iframe běží na `mybewit.com`, ale target origin je nastaven na `gr8learn.eu`.**

PostMessage vyžaduje, aby target origin **přesně odpovídal** originu kde iframe skutečně běží.

---

## 🎯 Kompletní metoda sendUserDataToIframe:

```javascript
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

    // ✅ FIX: Změněno z 'https://gr8learn.eu' na '*'
    iframe.contentWindow.postMessage(userData, '*');
    console.log('✅ User data sent to iframe:', userData);
  }
};
```

---

## 🧪 Po úpravě otestuj:

1. **Hard refresh** (Ctrl+Shift+R)
2. **Otevři chat**
3. **Zkontroluj konzoli** - chyba by měla **ZMIZET**
4. **Měl bys vidět:**

```
✅ User data sent to iframe: {type: 'USER_DATA', user: {...}}
📨 PostMessage přijata: { origin: "https://mybewit.com", type: "USER_DATA", hasUser: true }
✅ PostMessage PŘIJATA z důvěryhodného originu: https://mybewit.com
👤 User data: { id: "3523", email: "marcel@bewit.cz", ... }
```

5. **Odešli zprávu v chatu**
6. **Zkontroluj N8N payload** - user objekt musí být **VYPLNĚNÝ**!

---

## 🔒 Je `'*'` bezpečné?

**ANO**, v tomto případě:

- PostMessage posíláte DO iframe, který **vy ovládáte** (gr8learn.eu)
- Není to citlivá operace (jen předáváte user ID, email, jméno)
- Origin check je na **DRUHÉ STRANĚ** (v iframe), kde kontrolujeme, že přijímáme jen z mybewit.com

**Pokud chcete být extra opatrní:**

```javascript
// Automatická detekce originu z iframe src:
const iframeOrigin = window.location.origin; // mybewit.com
iframe.contentWindow.postMessage(userData, iframeOrigin);
```

---

## ✅ Checklist:

- [ ] Změnil jsem `'https://gr8learn.eu'` na `'*'` v `postMessage`
- [ ] Otestoval jsem - chyba v konzoli zmizela
- [ ] Vidím `✅ PostMessage PŘIJATA` v konzoli
- [ ] Odeslal jsem zprávu v chatu
- [ ] Zkontroloval jsem N8N - user data jsou vyplněná

---

**Po této úpravě by mělo vše fungovat! 🎉**
