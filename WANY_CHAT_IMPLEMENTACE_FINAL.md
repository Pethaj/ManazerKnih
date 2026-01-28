# 🎯 Wany Chat - Finální Implementace pro Klienta

## ✅ Hotovo!

Embed skript nyní **podporuje data-* atributy** pro předávání user dat!

---

## 📋 Copy-Paste Kód pro Klienta

Klient si **vybere jeden ze 2 způsobů**:

### **ZPŮSOB 1: Data-* Atributy (DOPORUČENO)**

✅ **Nejjednodušší** - stačí upravit atributy v iframe  
✅ **Žádný extra JavaScript**  
✅ **Funguje okamžitě**  
⚠️ Data viditelná v HTML source

```html
<!-- ========================================
     WANY CHAT WIDGET - START
     ======================================== -->
 
<!-- Dlaždice s tlačítkem -->
<div id="wany-chat-tile" style="position:relative;background-image:url('https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/images/main/production/Gemini_Generated_Image_gnhw0wgnhw0wgnhw.png');background-size:cover;background-position:center;border-radius:24px;padding:40px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);max-width:420px;margin:0 auto;text-align:center;overflow:hidden;">
  
  <!-- Tmavý overlay -->
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:1;"></div>
  
  <!-- Nadpis -->
  <h2 style="position:relative;z-index:2;font-size:28px;color:#ffffff;margin:0 0 16px 0;text-shadow:0 2px 4px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    Poradce na čínské wany
  </h2>
  
  <!-- Obsah -->
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:24px;">
    <p style="color:#e2e8f0;line-height:1.6;font-size:16px;margin:0;text-shadow:0 1px 3px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Náš asistent na wany dodá informace a poradí s výběrem produktu
    </p>
    
    <!-- Tlačítko Spustit Chat -->
    <button
      id="wany-chat-open-btn"
      onclick="openWanyChat()"
      style="width:180px;height:51px;border-radius:15px;cursor:pointer;transition:0.3s ease;background:linear-gradient(to bottom right,#2e8eff 0%,rgba(46,142,255,0) 30%);background-color:rgba(46,142,255,0.2);border:none;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;"
      onmouseover="this.style.backgroundColor='rgba(46,142,255,0.7)';this.style.boxShadow='0 0 10px rgba(46,142,255,0.5)'"
      onmouseout="this.style.backgroundColor='rgba(46,142,255,0.2)';this.style.boxShadow='none'"
    >
      <div style="width:176px;height:47px;border-radius:13px;background-color:#079854;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Spustit Chat
      </div>
    </button>
  </div>
</div>
 
<!-- Overlay pozadí (tmavé pozadí za modálem) -->
<div
  id="wany-chat-overlay"
  onclick="closeWanyChat()"
  style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999998;visibility:hidden;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(4px);"
></div>
 
<!-- Chat Modal Wrapper (pro správné umístění křížku) -->
<div
  id="wany-chat-wrapper"
  style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);width:90%;max-width:1200px;height:85%;max-height:800px;z-index:999999;visibility:hidden;opacity:0;transition:all 0.3s ease;"
>
  <!-- Nenápadný zavírací křížek (mimo modal, těsně u rohu) -->
  <button
    id="wany-close-btn"
    onclick="closeWanyChat()"
    style="position:absolute;top:-48px;right:0;z-index:10;background:rgba(0,0,0,0.6);color:white;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:18px;font-family:sans-serif;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;"
    onmouseover="this.style.opacity='1';this.style.background='rgba(0,0,0,0.9)'"
    onmouseout="this.style.opacity='0.8';this.style.background='rgba(0,0,0,0.6)'"
  >✕</button>
 
  <!-- Chat Modal (uprostřed obrazovky) -->
  <div
    id="wany-chat-modal"
    style="width:100%;height:100%;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;"
  >
    <!-- 
      🎯 UPRAVTE TYTO DATA-* ATRIBUTY PODLE PŘIHLÁŠENÉHO UŽIVATELE:
      
      S PHP:
      data-user-id="<?php echo $user->id; ?>"
      data-firstname="<?php echo htmlspecialchars($user->firstName); ?>"
      data-lastname="<?php echo htmlspecialchars($user->lastName); ?>"
      data-email="<?php echo htmlspecialchars($user->email); ?>"
      data-position="<?php echo htmlspecialchars($user->position); ?>"
      
      Nebo staticky pro testování:
      data-user-id="123"
      data-firstname="Jan"
      data-lastname="Novák"
      data-email="jan@firma.cz"
      data-position="Manager"
    -->
    <iframe
      id="wany-chat-iframe"
      src="https://gr8learn.eu/embed.html"
      style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
      allow="clipboard-write"
      title="Wany Chat"
      data-user-id=""
      data-firstname=""
      data-lastname=""
      data-email=""
      data-position=""
    ></iframe>
  </div>
</div>
 
<!-- JavaScript funkce -->
<script>
// Otevřít chat
function openWanyChat() {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');
  
  if (wrapper && overlay) {
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    document.body.style.overflow = 'hidden';
  }
}
 
// Zavřít chat
function closeWanyChat() {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');
  
  if (wrapper && overlay) {
    overlay.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    wrapper.style.visibility = 'hidden';
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translate(-50%, -50%) scale(0.95)';
    document.body.style.overflow = '';
  }
}
 
// ESC klávesa pro zavření
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const wrapper = document.getElementById('wany-chat-wrapper');
    if (wrapper && wrapper.style.visibility === 'visible') {
      closeWanyChat();
    }
  }
});
</script>
 
<!-- Responzivní CSS pro mobil -->
<style>
@media (max-width: 768px) {
  #wany-chat-tile {
    padding: 24px !important;
    max-width: calc(100% - 40px) !important;
    margin: 20px auto !important;
  }
  #wany-chat-tile h2 {
    font-size: 24px !important;
  }
  #wany-chat-tile p {
    font-size: 15px !important;
  }
  #wany-chat-wrapper {
    width: 95% !important;
    height: 90% !important;
    max-width: none !important;
    max-height: none !important;
  }
}
</style>
 
<!-- ========================================
     WANY CHAT WIDGET - END
     ======================================== -->
```

---

### **ZPŮSOB 2: PostMessage (Bezpečnější)**

✅ **Bezpečnější** - data nejsou v HTML  
✅ **Flexibilnější** - můžete měnit data dynamicky  
⚠️ Vyžaduje JavaScript

```html
<!-- Chat Iframe (BEZ data-* atributů) -->
<iframe
  id="wany-chat-iframe"
  src="https://gr8learn.eu/embed.html"
  style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>

<!-- PostMessage skript -->
<script>
(function() {
  const iframe = document.getElementById('wany-chat-iframe');
  if (!iframe) return;
  
  iframe.addEventListener('load', function() {
    iframe.contentWindow.postMessage({
      type: 'USER_DATA',
      user: {
        id: '<?php echo $user->id; ?>',
        firstName: '<?php echo htmlspecialchars($user->firstName); ?>',
        lastName: '<?php echo htmlspecialchars($user->lastName); ?>',
        email: '<?php echo htmlspecialchars($user->email); ?>',
        position: '<?php echo htmlspecialchars($user->position); ?>'
      }
    }, 'https://gr8learn.eu');
  });
})();
</script>
```

---

## 🔧 Co se změnilo v kódu

### Soubor: `src/pages/EmbedVanyChat.tsx`

Přidali jsme automatické čtení data-* atributů z iframe:

```typescript
// 🆕 Načti data přímo z data-* atributů iframe (pokud existují)
const iframe = window.frameElement as HTMLIFrameElement | null;
if (iframe) {
  const userData = {
    id: iframe.dataset.userId || '',
    email: iframe.dataset.email || '',
    firstName: iframe.dataset.firstname || '',
    lastName: iframe.dataset.lastname || '',
    position: iframe.dataset.position || ''
  };
  
  // Pokud nějaké data existují, nastav je okamžitě
  if (userData.id || userData.email) {
    console.log('📋 User data načtena z data-* atributů iframe:', userData);
    setUserContext(userData);
  }
}
```

**Důležité:**
- Data se načítají **okamžitě** při inicializaci
- PostMessage může data **přepsat/aktualizovat** později
- **Oba způsoby fungují současně** (backwards compatible)

---

## 📊 Jak data putují do N8N/Supabase

```
1. Klient nastaví data-* atributy v iframe
   ↓
2. Embed skript načte data z window.frameElement.dataset
   ↓
3. Data se uloží do userContext state
   ↓
4. Při každém odeslání zprávy se přidají do payloadu:
   {
     "sessionId": "...",
     "chatInput": "...",
     "user": {
       "id": "3523",
       "firstName": "Marcel",
       "lastName": "Haim",
       "email": "marcel.haim@bewit.cz",
       "position": "Supervisor"
     }
   }
   ↓
5. N8N webhook obdrží user data
   ↓
6. Data se uloží do Supabase: chat_messages.message_data.user_info
```

---

## 🧪 Testování

### Lokální test:
```bash
npm run dev
# Otevřete: http://localhost:5174/test-data-attributes.html
```

### Produkční test na gr8learn.eu:
1. Deploy nové verze na Vercel
2. Použijte iframe s data-* atributy
3. Zkontrolujte konzoli: `📋 User data načtena z data-* atributů iframe:`
4. Odešlete zprávu
5. Zkontrolujte N8N webhook log - měl by obsahovat user objekt

---

## 🔍 Debug Log Hlášky

Pokud data **fungují správně**, uvidíte v konzoli:

```
📋 User data načtena z data-* atributů iframe: {
  id: "3523",
  firstName: "Marcel",
  lastName: "Haim",
  email: "marcel.haim@bewit.cz",
  position: "Supervisor"
}
```

Pokud data **chybí**, uvidíte:

```
⚠️ Žádná user data v data-* atributech nenalezena
```

nebo

```
⚠️ window.frameElement není dostupný (možná není v iframe)
```

---

## 📦 Deployment

### 1. Build nové verze:
```bash
npm run build
```

### 2. Deploy na Vercel:
```bash
vercel --prod
```

### 3. Pošlete klientovi kód:
- Způsob 1 (data-* atributy) - viz výše
- Nebo Způsob 2 (postMessage) - podle preference

---

## 🔒 Bezpečnost

### Data-* atributy:
- ⚠️ **Viditelné v HTML source** (DevTools → Elements)
- ✅ OK pro: jméno, email (ne citlivý), ID, pozice
- ❌ NIKDY: hesla, API klíče, čísla karet, rodné číslo

### PostMessage:
- ✅ **Bezpečnější** - data nejsou v HTML
- ✅ Vhodné pro citlivější data
- ⚠️ Vyžaduje JavaScript

---

## ✅ Checklist pro Klienta

- [ ] Vybrat způsob předávání dat (data-* nebo postMessage)
- [ ] Zkopírovat kód z této dokumentace
- [ ] Upravit iframe src na `https://gr8learn.eu/embed.html`
- [ ] Nastavit user data (data-* atributy nebo postMessage)
- [ ] Otestovat lokálně
- [ ] Otevřít DevTools konzoli
- [ ] Zkontrolovat log: `📋 User data načtena...`
- [ ] Odeslat testovací zprávu
- [ ] Ověřit v N8N, že webhook obsahuje user data
- [ ] Deploy na produkci

---

## 🆘 Podpora

Pokud něco nefunguje:

1. **Zkontrolujte konzoli** (F12 → Console)
2. **Hledejte logy** začínající `📋` nebo `⚠️`
3. **Ověřte iframe atributy** - jsou správně nastavené?
4. **Zkontrolujte N8N webhook** - přicházejí user data?
5. **Kontaktujte podporu** s screenshot konzole

---

## 📝 Soubory

- `src/pages/EmbedVanyChat.tsx` - hlavní embed skript s podporou data-* atributů
- `public/test-data-attributes.html` - testovací stránka
- `WANY_CHAT_DATA_ATTRIBUTES_VERSION.md` - detailní dokumentace data-* způsobu
- `WANY_CHAT_IMPLEMENTACE_FINAL.md` - tento soubor

---

**🎉 Hotovo! Embed skript nyní podporuje oba způsoby předávání user dat.**
