# 🚀 EO Směsi Chat Widget - Průvodce nasazením

## 📋 Obsah
1. [Přehled](#přehled)
2. [Lokální vývoj](#lokální-vývoj)
3. [Nasazení na produkci](#nasazení-na-produkci)
4. [Implementace u klienta](#implementace-u-klienta)
5. [User Data Tracking](#user-data-tracking)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Přehled

EO Směsi Chat widget je **embeddable chatbot** specializovaný na esenciální oleje a směsi BEWIT, který lze vložit na jakoukoli webovou stránku pomocí `<iframe>`. Widget obsahuje:

- ✅ **100% stejné chování jako VanyChat** - všechny funkce zrcadlí nastavení z MedBase
- ✅ **User data tracking**: ID, jméno, email, pozice, e-shop token
- ✅ **Supabase integrace**: Historie chatu, metadata
- ✅ **N8N webhook**: Zpracování zpráv na dedikovaném endpointu
- ✅ **Responsivní design**: Desktop + mobile
- ✅ **Bez přihlášení**: Veřejný přístup

---

## 🔧 Lokální vývoj

### 1. Konfigurace Vite serveru

V souboru `vite.config.ts` je nastavené:

```typescript
build: {
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, 'index.html'),
      widget: path.resolve(__dirname, 'public/widgets/widget-chat.html'),
      embed: path.resolve(__dirname, 'embed.html'),
      embedEOSmesi: path.resolve(__dirname, 'embed-eo-smesi.html')
    }
  }
},
server: {
  headers: {
    'Content-Security-Policy': "frame-ancestors *",
  }
}
```

### 2. Spuštění dev serveru

```bash
npm run dev
```

Server poběží na `http://localhost:5173`

### 3. Testování

Otevři testovací stránku:
```
http://localhost:5173/public/widgets/test-eo-smesi-embed.html
```

Tato stránka testuje:
- ✅ Iframe embedding (CSP hlavičky)
- ✅ Data-* atributy pro user data
- ✅ PostMessage API
- ✅ IFRAME_READY signál
- ✅ Responsivní design
- ✅ N8N webhook volání

---

## 🌐 Nasazení na produkci

### Krok 1: Build aplikace

```bash
npm run build
```

Vytvoří se `dist/` složka s produkčními soubory včetně:
- `/embed-eo-smesi.html` - HTML wrapper
- `/assets/embed-eo-smesi-*.js` - JavaScript bundle
- `/assets/embed-eo-smesi-*.css` - CSS styles

### Krok 2: Konfigurace serveru

#### **Nginx**

```nginx
server {
    listen 443 ssl;
    server_name gr8learn.eu;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/gr8learn/dist;
    index index.html;

    # Hlavičky pro iframe embedding
    location /embed-eo-smesi.html {
        add_header Content-Security-Policy "frame-ancestors *" always;
        add_header X-Frame-Options "ALLOWALL" always;
        try_files $uri $uri/ =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache statických souborů
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### **Apache**

Vytvoř `.htaccess` v `dist/` složce:

```apache
<IfModule mod_headers.c>
    <FilesMatch "embed-eo-smesi\.html$">
        Header set Content-Security-Policy "frame-ancestors *"
        Header set X-Frame-Options "ALLOWALL"
    </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

### Krok 3: Upload na server

```bash
# SCP
scp -r dist/* user@gr8learn.eu:/var/www/gr8learn/

# Rsync
rsync -avz --delete dist/ user@gr8learn.eu:/var/www/gr8learn/
```

### Krok 4: Restart serveru

```bash
# Nginx
sudo systemctl restart nginx

# Apache
sudo systemctl restart apache2
```

### Krok 5: Test produkční URL

```bash
# Test CSP hlaviček
curl -I https://gr8learn.eu/embed-eo-smesi.html | grep -i "content-security\|x-frame"

# Očekávaný výstup:
# Content-Security-Policy: frame-ancestors *
# X-Frame-Options: ALLOWALL
```

---

## 👨‍💻 Implementace u klienta

### Varianta A: Vždy viditelný chat (doporučená)

Klient vloží tento kód na svůj web před `</body>` tag:

```html
<!-- EO Směsi Chat Widget -->
<iframe
  id="eo-smesi-chat-iframe"
  src="https://gr8learn.eu/embed-eo-smesi.html"
  style="position:fixed; right:24px; bottom:24px; width:1200px; height:700px; 
         border:0; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); 
         z-index:999999;"
  allow="clipboard-write"
  title="EO Směsi Chat"
  data-user-id="<?php echo $user->id; ?>"
  data-firstname="<?php echo $user->firstName; ?>"
  data-lastname="<?php echo $user->lastName; ?>"
  data-email="<?php echo $user->email; ?>"
  data-position="<?php echo $user->position; ?>"
  data-token-eshop="<?php echo $user->tokenEshop; ?>"
></iframe>

<script>
(function() {
  const iframe = document.getElementById('eo-smesi-chat-iframe');
  if (!iframe) return;
  
  iframe.addEventListener('load', function() {
    iframe.contentWindow.postMessage({
      type: 'USER_DATA',
      user: {
        id: iframe.getAttribute('data-user-id'),
        firstName: iframe.getAttribute('data-firstname'),
        lastName: iframe.getAttribute('data-lastname'),
        email: iframe.getAttribute('data-email'),
        position: iframe.getAttribute('data-position'),
        tokenEshop: iframe.getAttribute('data-token-eshop')
      }
    }, 'https://gr8learn.eu');
  });
})();
</script>
```

### Varianta B: S tlačítkem pro otevření/zavření

```html
<!-- Toggle tlačítko -->
<button id="eo-smesi-chat-toggle" style="position:fixed; right:24px; bottom:24px; width:60px; height:60px; 
        border-radius:50%; background:#2563eb; color:white; border:none; 
        box-shadow:0 10px 25px rgba(0,0,0,0.2); cursor:pointer; z-index:999998; font-size:24px;">
  💬
</button>

<!-- Iframe (skrytý na začátku) -->
<iframe 
  id="eo-smesi-chat-iframe"
  src="https://gr8learn.eu/embed-eo-smesi.html"
  allow="clipboard-write"
  title="EO Směsi Chat"
  style="position:fixed; right:24px; bottom:24px; width:1200px; height:700px; 
         border:0; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); 
         z-index:999999; display:none;"
  data-user-id="<?php echo $user->id; ?>"
  data-firstname="<?php echo $user->firstName; ?>"
  data-lastname="<?php echo $user->lastName; ?>"
  data-email="<?php echo $user->email; ?>"
  data-position="<?php echo $user->position; ?>"
  data-token-eshop="<?php echo $user->tokenEshop; ?>"
></iframe>

<script>
  const toggleBtn = document.getElementById('eo-smesi-chat-toggle');
  const chatIframe = document.getElementById('eo-smesi-chat-iframe');
  let isOpen = false;

  toggleBtn.addEventListener('click', function() {
    isOpen = !isOpen;
    
    if (isOpen) {
      chatIframe.style.display = 'block';
      toggleBtn.textContent = '✕';
      toggleBtn.style.background = '#dc2626';
    } else {
      chatIframe.style.display = 'none';
      toggleBtn.textContent = '💬';
      toggleBtn.style.background = '#2563eb';
    }
  });
  
  // Pošleme user data do iframe
  chatIframe.addEventListener('load', function() {
    chatIframe.contentWindow.postMessage({
      type: 'USER_DATA',
      user: {
        id: chatIframe.getAttribute('data-user-id'),
        firstName: chatIframe.getAttribute('data-firstname'),
        lastName: chatIframe.getAttribute('data-lastname'),
        email: chatIframe.getAttribute('data-email'),
        position: chatIframe.getAttribute('data-position'),
        tokenEshop: chatIframe.getAttribute('data-token-eshop')
      }
    }, 'https://gr8learn.eu');
  });
</script>
```

### Varianta C: Responsivní (desktop + mobile)

```html
<style>
  #eo-smesi-chat-iframe {
    position: fixed;
    z-index: 999999;
    border: 0;
  }

  /* Desktop */
  @media (min-width: 769px) {
    #eo-smesi-chat-iframe {
      right: 24px;
      bottom: 24px;
      width: 1200px;
      height: 700px;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
  }

  /* Mobile */
  @media (max-width: 768px) {
    #eo-smesi-chat-iframe {
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
  }
</style>

<iframe 
  id="eo-smesi-chat-iframe"
  src="https://gr8learn.eu/embed-eo-smesi.html"
  allow="clipboard-write"
  title="EO Směsi Chat"
></iframe>
```

---

## 👤 User Data Tracking

### Data-* Atributy (ZPŮSOB 1)

EO Směsi Chat podporuje následující data-* atributy na iframe elementu:

| Atribut | Popis | Příklad |
|---------|-------|---------|
| `data-user-id` | ID uživatele v systému klienta | `"12345"` |
| `data-firstname` | Křestní jméno | `"Jan"` |
| `data-lastname` | Příjmení | `"Novák"` |
| `data-email` | Email | `"jan@firma.cz"` |
| `data-position` | Pozice/Role | `"Manager"` |
| `data-token-eshop` | E-shop token z Bewit | `"abc123xyz"` |

**Výhody:**
- ✅ Jednoduchá implementace
- ✅ Žádný JavaScript nutný
- ✅ Funguje okamžitě

**Nevýhody:**
- ⚠️ Data viditelná v HTML source
- ⚠️ Není vhodné pro citlivá data

### PostMessage API (ZPŮSOB 2)

Bezpečnější způsob přenosu dat přes JavaScript:

```javascript
const iframe = document.getElementById('eo-smesi-chat-iframe');

iframe.addEventListener('load', function() {
  iframe.contentWindow.postMessage({
    type: 'USER_DATA',
    user: {
      id: '123',
      firstName: 'Jan',
      lastName: 'Novák',
      email: 'jan@firma.cz',
      position: 'Manager',
      tokenEshop: 'abc123xyz'
    }
  }, 'https://gr8learn.eu');
});
```

**Výhody:**
- ✅ Bezpečnější (data nejsou v HTML)
- ✅ Lze aktualizovat za běhu
- ✅ Origin validation

**Nevýhody:**
- ⚠️ Vyžaduje JavaScript

### Kombinace obou způsobů

Můžeš použít data-* atributy jako výchozí hodnoty a postMessage pro aktualizaci/override:

```html
<iframe
  id="eo-smesi-chat-iframe"
  src="https://gr8learn.eu/embed-eo-smesi.html"
  data-user-id="123"
  data-email="jan@firma.cz"
></iframe>

<script>
  // PostMessage může později přepsat/aktualizovat data
  iframe.contentWindow.postMessage({
    type: 'USER_DATA',
    user: { id: '456', email: 'new@email.cz' }
  }, 'https://gr8learn.eu');
</script>
```

### Kam se data ukládají

1. **Supabase databáze:**
   - Tabulka: `chat_messages`
   - Pole: `message_data.user_info`
   - Struktura:
     ```json
     {
       "external_user_id": "123",
       "first_name": "Jan",
       "last_name": "Novák",
       "email": "jan@firma.cz",
       "position": "Manager",
       "token_eshop": "abc123xyz"
     }
     ```

2. **N8N Webhook:**
   - URL: `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat`
   - Payload obsahuje `user` objekt
   - Dostupné pro workflow logiku

3. **Filtrování v SQL:**
   ```sql
   SELECT * FROM chat_messages 
   WHERE message_data->>'user_info'->>'email' = 'jan@firma.cz';
   ```

### IFRAME_READY Signál

Chat odesílá signál rodičovskému oknu po dokončení načítání:

```javascript
window.addEventListener('message', function(event) {
  if (event.data.type === 'IFRAME_READY') {
    console.log('✅ Chat je připraven!');
    // Nyní můžeš poslat user data
  }
});
```

---

## 🔒 Bezpečnost a konfigurace

### Supabase RLS (Row Level Security)

Ujisti se že `chatbot_settings` má veřejný read access:

```sql
CREATE POLICY "Allow public read for eo_smesi"
ON chatbot_settings FOR SELECT
USING (chatbot_id = 'eo_smesi');
```

### N8N Webhook

**URL:** `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat`

**Test:**
```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "action": "sendMessage",
    "chatInput": "Test",
    "chatHistory": [],
    "metadata": {}
  }'
```

### CORS hlavičky

Pro přístup k Supabase API z jiných domén:

V Supabase Dashboard → Authentication → URL Configuration:
- Přidej `https://bewit.cz` do **Site URL** whitelist
- Přidej `https://www.bewit.cz` do whitelist
- Přidej `https://mybewit.com` do whitelist

### Povolené originy (PostMessage)

V `EmbedEOSmesi.tsx` jsou definované:

```typescript
const allowedOrigins = [
  'https://www.bewit.cz',
  'https://bewit.cz',
  'https://mybewit.com',
  'https://www.mybewit.com',
  // Pro testování:
  'http://localhost:3000',
  'http://localhost:5173',
];
```

---

## 🐛 Troubleshooting

### Problém: Iframe se nezobrazuje

**Diagnóza:**
```bash
curl -I https://gr8learn.eu/embed-eo-smesi.html | grep -i "x-frame"
```

**Řešení:**
1. Zkontroluj CSP hlavičky na serveru
2. Přidej `Content-Security-Policy: frame-ancestors *`
3. Restart serveru
4. Vyčisti cache (`Ctrl+Shift+R`)

### Problém: User data se neukládají

**Diagnóza:**
- Otevři Developer Tools → Console
- Hledej logy: `📋 User data načtena...`
- Zkontroluj Supabase: `SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 5;`

**Řešení:**
1. Ověř že data-* atributy jsou správně nastavené
2. Zkontroluj že `window.frameElement` je dostupný
3. Test postMessage z console

### Problém: N8N nepřijímá zprávy

**Diagnóza:**
```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Řešení:**
1. Ověř že N8N workflow je aktivní
2. Zkontroluj webhook URL v databázi
3. Zkontroluj firewall/CORS na N8N serveru

### Problém: Chatbot načítá nesprávné nastavení

**Diagnóza:**
```sql
SELECT * FROM chatbot_settings WHERE chatbot_id = 'eo_smesi';
```

**Řešení:**
1. Spusť `verify_eo_smesi_chatbot.sql`
2. Ověř že `chatbot_id = 'eo_smesi'`
3. Ověř že `webhook_url` je správná
4. Zkontroluj `is_active = true`

### Problém: Markdown se nerenduje správně

**Kontrola:**
Zkontroluj že v `SanaChat.tsx` je podmínka:

```typescript
const usesMarkdown = 
  chatbotId === 'sana_local_format' || 
  chatbotId === 'vany_chat' || 
  chatbotId === 'eo_smesi' ||  // ✅ Musí být zde
  chatbotId === 'wany_chat_local';
```

---

## 📊 Monitoring

### Logy v konzoli

**Frontend (EmbedEOSmesi.tsx):**
```
🔥 EMBED EO SMESI CHAT - Loading settings...
📋 User data načtena z data-* atributů iframe: {...}
✅ Chatbot settings loaded from DB: {...}
📤 Odesílám IFRAME_READY signál rodičovskému oknu...
```

**Klientská stránka:**
```
✅ EO Směsi Chat iframe je připraven!
📤 User data odeslána přes postMessage
```

### SQL queries pro monitoring

```sql
-- Počet zpráv za poslední hodinu
SELECT COUNT(*) FROM chat_messages 
WHERE chatbot_id = 'eo_smesi' 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Unikátní uživatelé
SELECT DISTINCT 
  message_data->'user_info'->>'email' as user_email,
  COUNT(*) as message_count
FROM chat_messages 
WHERE chatbot_id = 'eo_smesi'
GROUP BY message_data->'user_info'->>'email';

-- E-shop tokeny v použití
SELECT DISTINCT 
  message_data->'user_info'->>'token_eshop' as token
FROM chat_messages 
WHERE chatbot_id = 'eo_smesi' 
  AND message_data->'user_info'->>'token_eshop' IS NOT NULL;
```

---

## 📞 Kontakt a podpora

Pro technickou podporu:
- **Email:** podpora@bewit.love
- **Documentation:** Tento soubor

---

## 📝 Changelog

### v1.0.0 (2026-01-29)
- ✅ Vytvoření EO Směsi embed systému
- ✅ 100% paritu s VanyChat
- ✅ User data tracking (včetně e-shop tokenu)
- ✅ Supabase integrace
- ✅ N8N webhook
- ✅ IFRAME_READY signál
- ✅ PostMessage API
- ✅ Responsivní design
- ✅ Testovací stránka

---

## 🎯 Rozdíly oproti VanyChat

| Vlastnost | VanyChat | EO Směsi Chat |
|-----------|----------|---------------|
| **Chatbot ID** | `vany_chat` | `eo_smesi` |
| **Název** | "Wany Chat" | "EO Směsi Chat" |
| **Webhook URL** | `...22856d03-acea.../chat` | `...20826009-b007.../chat` |
| **HTML soubor** | `embed.html` | `embed-eo-smesi.html` |
| **Entry point** | `embed-entry.tsx` | `embed-eo-smesi-entry.tsx` |
| **Komponenta** | `EmbedVanyChat.tsx` | `EmbedEOSmesi.tsx` |
| **Iframe ID** | `wany-chat-iframe` | `eo-smesi-chat-iframe` |

**VŠE OSTATNÍ JE IDENTICKÉ** - všechna nastavení, funkce, a chování zrcadlí MedBase konfiguraci.

---

**🎉 EO Směsi Chat je ready pro nasazení u klientů!**
