# 🚀 GR8Learn - Wany Chat Integrace s User Tracking

## 📋 Přehled

Tento průvodce popisuje jak integrovat Wany Chat na web **GR8Learn** s automatickým sledováním uživatelů.

### Co se sleduje:
- ✅ **User ID** - ID uživatele z GR8Learn databáze
- ✅ **Jméno uživatele** - Pro personalizaci konverzace
- ✅ **Email** - Pro budoucí follow-up komunikaci
- ✅ **Všechny zprávy** - Historie konverzací pro každého uživatele

### Kam se data posílají:
- Data se posílají do **N8N webhook**: `https://n8n.sanaai.cz/webhook/chat-vany`
- N8N ukládá data do databáze a posílá do AI modelu
- Můžeš pak sledovat kdo, kdy a co se ptal

---

## 🎯 Krok 1: Zjistit user data z GR8Learn backendu

Na GR8Learn webu už máš **přihlášeného uživatele**. Potřebuješ tyto informace:

```javascript
// Příklad: user data z Laravel/PHP backendu
const CURRENT_USER = {
    userId: '<?php echo $user->id; ?>',      // Z backendu
    userName: '<?php echo $user->name; ?>',  // Z backendu
    userEmail: '<?php echo $user->email; ?>' // Z backendu
};
```

**NEBO z localStorage** (pokud GR8Learn ukládá user session do localStorage):

```javascript
const CURRENT_USER = {
    userId: localStorage.getItem('userId'),
    userName: localStorage.getItem('userName'),
    userEmail: localStorage.getItem('userEmail')
};
```

**NEBO z cookie** (pokud GR8Learn ukládá user session do cookies):

```javascript
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const CURRENT_USER = {
    userId: getCookie('user_id'),
    userName: getCookie('user_name'),
    userEmail: getCookie('user_email')
};
```

---

## 🎯 Krok 2: Upravený widget kód (s user tracking)

Nahraď původní widget kód tímto:

```html
<!-- ========================================
     WANY CHAT WIDGET - START
     ======================================== -->

<!-- 1️⃣ Načtení user dat -->
<script>
// DŮLEŽITÉ: Nahraď tento kód skutečnými user daty z GR8Learn backendu
const CURRENT_USER = {
    userId: '<?php echo $user->id; ?>',      // ← Z backendu
    userName: '<?php echo $user->name; ?>',  // ← Z backendu
    userEmail: '<?php echo $user->email; ?>' // ← Z backendu
};

console.log('👤 Current user:', CURRENT_USER);
</script>

<!-- 2️⃣ Dlaždice s tlačítkem (BEZE ZMĚN) -->
<div id="wany-chat-tile" style="position:relative;background-image:url('https://modopafybeslbcqjxsve.supabase.co/storage/v1/object/public/images/main/production/Gemini_Generated_Image_gnhw0wgnhw0wgnhw.png');background-size:cover;background-position:center;border-radius:24px;padding:40px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);max-width:420px;margin:0 auto;text-align:center;overflow:hidden;">
  
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:1;"></div>
  
  <h2 style="position:relative;z-index:2;font-size:28px;color:#ffffff;margin:0 0 16px 0;text-shadow:0 2px 4px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    Poradce na čínské wany
  </h2>
  
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:24px;">
    <p style="color:#e2e8f0;line-height:1.6;font-size:16px;margin:0;text-shadow:0 1px 3px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Náš asistent na wany dodá informace a poradí s výběrem produktu
    </p>
    
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

<!-- 3️⃣ Overlay pozadí (BEZE ZMĚN) -->
<div
  id="wany-chat-overlay"
  onclick="closeWanyChat()"
  style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999998;visibility:hidden;opacity:0;transition:opacity 0.3s ease;backdrop-filter:blur(4px);"
></div>

<!-- 4️⃣ Chat Modal Wrapper -->
<div
  id="wany-chat-wrapper"
  style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);width:90%;max-width:1200px;height:85%;max-height:800px;z-index:999999;visibility:hidden;opacity:0;transition:all 0.3s ease;"
>
  <button
    id="wany-close-btn"
    onclick="closeWanyChat()"
    style="position:absolute;top:-48px;right:0;z-index:10;background:rgba(0,0,0,0.6);color:white;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:18px;font-family:sans-serif;transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;"
    onmouseover="this.style.opacity='1';this.style.background='rgba(0,0,0,0.9)'"
    onmouseout="this.style.opacity='0.8';this.style.background='rgba(0,0,0,0.6)'"
  >✕</button>

  <div
    id="wany-chat-modal"
    style="width:100%;height:100%;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;"
  >
    <!-- ⚠️ DŮLEŽITÉ: Iframe src se nastaví dynamicky (nepřidávej src="" sem!) -->
    <iframe
      id="wany-chat-iframe"
      style="width:100%;height:100%;border:0;border-radius:24px;background:#fff;"
      allow="clipboard-write"
      title="Wany Chat"
    ></iframe>
  </div>
</div>

<!-- 5️⃣ JavaScript funkce (🆕 UPRAVENÉ) -->
<script>
// 🆕 Funkce pro sestavení iframe URL s user parametry
function buildWanyChatUrl() {
  const baseUrl = 'https://gr8learn.eu/embed.html';
  
  // Zkontroluj zda jsou user data dostupná
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER.userId) {
    console.warn('⚠️ User data nejsou dostupná - chat bude bez user tracking');
    return baseUrl;
  }
  
  // Sestav URL s parametry
  const params = new URLSearchParams();
  params.append('userId', CURRENT_USER.userId);
  if (CURRENT_USER.userName) params.append('userName', CURRENT_USER.userName);
  if (CURRENT_USER.userEmail) params.append('userEmail', CURRENT_USER.userEmail);
  
  const finalUrl = `${baseUrl}?${params.toString()}`;
  console.log('🔗 Wany Chat URL:', finalUrl);
  return finalUrl;
}

// 🆕 Otevřít chat (UPRAVENÁ FUNKCE)
function openWanyChat() {
  const wrapper = document.getElementById('wany-chat-wrapper');
  const overlay = document.getElementById('wany-chat-overlay');
  const iframe = document.getElementById('wany-chat-iframe');
  
  if (wrapper && overlay && iframe) {
    // 🆕 Nastav iframe src pouze pokud ještě není nastavené (lazy loading)
    if (!iframe.src) {
      iframe.src = buildWanyChatUrl();
      console.log('✅ Iframe src nastaven:', iframe.src);
    }
    
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
    document.body.style.overflow = 'hidden';
  }
}

// Zavřít chat (BEZE ZMĚN)
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

// ESC klávesa (BEZE ZMĚN)
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const wrapper = document.getElementById('wany-chat-wrapper');
    if (wrapper && wrapper.style.visibility === 'visible') {
      closeWanyChat();
    }
  }
});
</script>

<!-- Responzivní CSS (BEZE ZMĚN) -->
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

## 🔍 Co se změnilo?

### ✅ Přidáno:

1. **Načtení user dat** (sekce 1️⃣)
   - Definice `CURRENT_USER` objektu
   - Obsahuje userId, userName, userEmail

2. **Funkce `buildWanyChatUrl()`** (sekce 5️⃣)
   - Sestaví iframe URL s user parametry
   - Kontroluje dostupnost user dat

3. **Upravená funkce `openWanyChat()`** (sekce 5️⃣)
   - Nastaví iframe `src` až při prvním otevření (lazy loading)
   - Volá `buildWanyChatUrl()` pro sestavení URL s parametry

### ⚠️ Nezměněno:

- Dlaždice s tlačítkem (stejný design)
- Overlay pozadí (stejné)
- Modal wrapper (stejné)
- Zavírací křížek (stejné)
- `closeWanyChat()` funkce (stejné)
- ESC klávesa handling (stejné)
- Responsivní CSS (stejné)

---

## 📊 Co se posílá do N8N?

Když uživatel pošle zprávu, N8N webhook dostane tento payload:

```json
{
  "sessionId": "abc123...",
  "action": "sendMessage",
  "chatInput": "Jaké wany máte?",
  "chatHistory": [...],
  "intent": "chat",
  "metadata": {
    "categories": ["UUID-TCM", "UUID-WANY"],
    "labels": [],
    "publication_types": [...]
  },
  "user": {
    "id": "12345",
    "email": "jan.novak@gr8learn.eu",
    "firstName": "Jan",
    "lastName": "Novák",
    "role": "spravce"
  }
}
```

### 🎯 Pole "user":
- `id`: User ID z GR8Learn
- `email`: Email uživatele
- `firstName`: Jméno
- `lastName`: Příjmení
- `role`: Pevně nastaveno na "spravce" (není důležité pro tracking)

---

## 🧪 Testování

### Lokální test:

1. **Spusť dev server:**
   ```bash
   npm run dev
   ```

2. **Otevři testovací stránku:**
   ```
   http://localhost:5173/public/widgets/test-gr8learn-integration.html
   ```

3. **Otevři Developer Tools (F12):**
   - **Console**: Uvidíš user data a iframe URL
   - **Network**: Sleduj POST request na N8N webhook
   - **Payload**: Zkontroluj pole "user" v payloadu

### Produkční test:

1. **Nahraj na GR8Learn web**
2. **Otevři chat**
3. **Pošli testovací zprávu**
4. **Zkontroluj N8N:** Měl by být request s user daty

---

## 🔒 Bezpečnost

### ✅ Co je bezpečné:
- User ID a jméno se posílají přes HTTPS
- Data nejsou přístupná třetím stranám
- Iframe běží na `https://gr8learn.eu` (tvoje doména)

### ⚠️ Poznámky:
- User data jsou viditelná v URL parametrech iframe
- To je OK, protože iframe je na stejné doméně
- N8N webhook je chráněný (pouze z `gr8learn.eu`)

---

## 🚀 Nasazení

### 1. Build aplikace

```bash
npm run build
```

### 2. Deploy na Vercel/server

```bash
# Vercel
vercel --prod

# NEBO ručně nahrát dist/ na server
```

### 3. Změň URL v widget kódu

V části 5️⃣ JavaScript funkce změň:

```javascript
// Z:
const baseUrl = 'https://gr8learn.eu/embed.html';

// NA produkční URL (pokud je jiná):
const baseUrl = 'https://VASE-PRODUKCE-DOMENA.cz/embed.html';
```

### 4. Aktualizuj CORS v Supabase

V Supabase Dashboard → Authentication → URL Configuration:
- Přidej `https://gr8learn.eu` do Site URL whitelist

---

## 📞 Podpora

Pokud něco nefunguje:

1. **Otevři Developer Tools (F12)**
2. **Zkontroluj Console pro chyby**
3. **Zkontroluj Network tab pro N8N requests**
4. **Kontaktuj:** podpora@bewit.love

---

## 🎉 Hotovo!

Po nasazení bude Wany Chat automaticky sledovat:
- ✅ Kdo se ptal (User ID)
- ✅ Co se ptal (zpráva)
- ✅ Kdy se ptal (timestamp)
- ✅ Historie konverzace pro každého uživatele

Můžeš pak sledovat data v N8N nebo databázi.
