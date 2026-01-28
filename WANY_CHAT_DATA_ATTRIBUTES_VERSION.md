# Wany Chat Widget - Verze s Data Atributy

Toto je **nejjednodušší verze** implementace Wany Chatu s uživatelskými daty.

## ✅ Výhody

- **Jednoduchá implementace** - stačí upravit data-* atributy v iframe
- **Žádný JavaScript** - není potřeba žádný extra skript
- **Funguje okamžitě** - data jsou dostupná hned při načtení
- **Funguje i bez PHP** - můžete použít i statické hodnoty

## ⚠️ Nevýhody

- **Data jsou viditelná v HTML source code** - každý může vidět user data v DevTools
- **Méně bezpečné** - nepoužívejte pro citlivá data

---

## 📋 Copy-Paste Implementace

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
      ⚠️ DŮLEŽITÉ: Zde upravte data-* atributy podle přihlášeného uživatele!
      
      Pokud používáte PHP:
      data-user-id="<?php echo $user->id; ?>"
      data-firstname="<?php echo htmlspecialchars($user->firstName); ?>"
      data-lastname="<?php echo htmlspecialchars($user->lastName); ?>"
      data-email="<?php echo htmlspecialchars($user->email); ?>"
      data-position="<?php echo htmlspecialchars($user->position); ?>"
      
      Pokud používáte jiný backend, nahraďte PHP kódem vašeho systému.
    -->
    <iframe
      id="wany-chat-iframe"
      src="https://gr8learn.eu/embed.html"
      style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
      allow="clipboard-write"
      title="Wany Chat"
      data-user-id="3523"
      data-firstname="Marcel"
      data-lastname="Haim"
      data-email="marcel.haim@bewit.cz"
      data-position="Supervisor"
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
    // Zobrazit overlay a wrapper (který obsahuje modal i křížek)
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    
    // Zablokovat scroll stránky
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
    
    // Obnovit scroll stránky
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

## 🔧 Jak upravit pro vašeho uživatele

V iframe tagu najděte tyto řádky a upravte hodnoty:

```html
data-user-id="3523"              ← ID uživatele z vaší databáze
data-firstname="Marcel"           ← Jméno uživatele
data-lastname="Haim"              ← Příjmení uživatele
data-email="marcel.haim@bewit.cz" ← Email uživatele
data-position="Supervisor"        ← Pozice/role uživatele
```

### Příklad s PHP:

```html
<iframe
  id="wany-chat-iframe"
  src="https://gr8learn.eu/embed.html"
  style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
  allow="clipboard-write"
  title="Wany Chat"
  data-user-id="<?php echo $user->id; ?>"
  data-firstname="<?php echo htmlspecialchars($user->firstName); ?>"
  data-lastname="<?php echo htmlspecialchars($user->lastName); ?>"
  data-email="<?php echo htmlspecialchars($user->email); ?>"
  data-position="<?php echo htmlspecialchars($user->position); ?>"
></iframe>
```

### Příklad s JavaScript:

```html
<iframe
  id="wany-chat-iframe"
  src="https://gr8learn.eu/embed.html"
  style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>

<script>
// Nastavit data atributy dynamicky z JavaScriptu
const iframe = document.getElementById('wany-chat-iframe');
const currentUser = getCurrentUser(); // vaše funkce pro získání uživatele

iframe.dataset.userId = currentUser.id;
iframe.dataset.firstname = currentUser.firstName;
iframe.dataset.lastname = currentUser.lastName;
iframe.dataset.email = currentUser.email;
iframe.dataset.position = currentUser.position;
</script>
```

---

## 📊 Co se s daty děje

User data se automaticky přidají do každého požadavku do N8N webhook a uloží se do Supabase:

```json
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
```

---

## ✅ Testování

1. Zkopírujte kód výše
2. Vložte na vaši stránku
3. Upravte data-* atributy podle vašeho uživatele
4. Otevřete stránku a spusťte chat
5. V konzoli zkontrolujte log: `📋 User data načtena z data-* atributů iframe`
6. Odešlete zprávu a zkontrolujte N8N webhook - měla by obsahovat user data

---

## 🔒 Bezpečnost

⚠️ **DŮLEŽITÉ:** Data v data-* atributech jsou viditelná každému, kdo si otevře DevTools v prohlížeči!

**NEPOUŽÍVEJTE pro:**
- Hesla
- API klíče
- Čísla kreditních karet
- Osobní čísla (rodné číslo, číslo OP)
- Jiná citlivá data

**VHODNÉ pro:**
- Jméno a příjmení
- Email (pokud není citlivý)
- ID uživatele (pokud není citlivé)
- Pozice/role

Pokud potřebujete vyšší bezpečnost, použijte **postMessage verzi** - viz `WANY_CHAT_POSTMESSAGE_VERSION.md`

---

## 🆘 Podpora

Pokud data nefungují:
1. Otevřete DevTools (F12) → Console
2. Hledejte logy začínající `📋` nebo `⚠️`
3. Zkontrolujte, že iframe má správně nastavené data-* atributy
4. Kontaktujte podporu Bewit
