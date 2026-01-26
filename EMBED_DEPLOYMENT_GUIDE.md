# 🚀 Wany Chat Widget - Průvodce nasazením

## 📋 Obsah
1. [Přehled](#přehled)
2. [Lokální vývoj](#lokální-vývoj)
3. [Nasazení na produkci](#nasazení-na-produkci)
4. [Implementace u klienta](#implementace-u-klienta)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Přehled

Wany Chat widget je **embeddable chatbot**, který lze vložit na jakoukoli webovou stránku pomocí `<iframe>`. Widget obsahuje:

- ✅ **Filtry**: Pouze TČM a Wany (bez štítků)
- ✅ **Responsivní design**: Desktop + mobile
- ✅ **N8N integrace**: Webhook pro zpracování zpráv
- ✅ **Supabase**: Databáze pro nastavení a metadata
- ✅ **Bez přihlášení**: Veřejný přístup

---

## 🔧 Lokální vývoj

### 1. Konfigurace Vite serveru

V souboru `vite.config.ts` musí být nastavené HTTP hlavičky pro povolení iframe embeddingu:

```typescript
server: {
  port: 5173,
  headers: {
    // Povolí vložení do iframe z jakékoliv domény
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
http://localhost:5173/public/widgets/test-klient-embed.html
```

Tato stránka simuluje web klienta a testuje:
- ✅ Iframe embedding (CSP hlavičky)
- ✅ Responsivní design
- ✅ Funkčnost chatu
- ✅ N8N webhook volání

---

## 🌐 Nasazení na produkci

### Krok 1: Build aplikace

```bash
npm run build
```

Vytvoří se `dist/` složka s produkčními soubory.

### Krok 2: Konfigurace serveru

#### **Nginx**

Přidej do konfigurace:

```nginx
server {
    listen 443 ssl;
    server_name medbase.cz;

    # SSL certifikáty
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Root složka
    root /var/www/medbase/dist;
    index index.html;

    # Hlavičky pro iframe embedding
    location /embed.html {
        add_header Content-Security-Policy "frame-ancestors *" always;
        add_header X-Frame-Options "ALLOWALL" always;
        try_files $uri $uri/ =404;
    }

    # Ostatní soubory
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
# Povolení iframe embeddingu
<IfModule mod_headers.c>
    <FilesMatch "embed\.html$">
        Header set Content-Security-Policy "frame-ancestors *"
        Header set X-Frame-Options "ALLOWALL"
    </FilesMatch>
</IfModule>

# Rewrite rules pro SPA
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
scp -r dist/* user@medbase.cz:/var/www/medbase/

# FTP
# Použij FTP klienta (FileZilla, WinSCP)

# Rsync
rsync -avz --delete dist/ user@medbase.cz:/var/www/medbase/
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
curl -I https://medbase.cz/embed.html | grep -i "content-security\|x-frame"

# Očekávaný výstup:
# Content-Security-Policy: frame-ancestors *
# X-Frame-Options: ALLOWALL
```

---

## 👨‍💻 Implementace u klienta

### Varianta A: Vždy viditelný chat (doporučená)

Klient vloží tento kód na svůj web před `</body>` tag:

```html
<!-- Wany Chat Widget -->
<iframe
  id="wany-chat-iframe"
  src="https://medbase.cz/embed.html"
  style="position:fixed; right:24px; bottom:24px; width:1200px; height:700px; 
         border:0; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); 
         z-index:999999;"
  allow="clipboard-write"
  title="Wany Chat"
  data-user-id="<?php echo $user->id; ?>"
  data-firstname="<?php echo $user->firstName; ?>"
  data-lastname="<?php echo $user->lastName; ?>"
  data-email="<?php echo $user->email; ?>"
  data-position="<?php echo $user->position; ?>"
></iframe>

<script>
(function() {
  const iframe = document.getElementById('wany-chat-iframe');
  if (!iframe) return;
  
  iframe.addEventListener('load', function() {
    iframe.contentWindow.postMessage({
      type: 'USER_DATA',
      user: {
        id: iframe.getAttribute('data-user-id'),
        firstName: iframe.getAttribute('data-firstname'),
        lastName: iframe.getAttribute('data-lastname'),
        email: iframe.getAttribute('data-email'),
        position: iframe.getAttribute('data-position')
      }
    }, 'https://medbase.cz');
  });
})();
</script>
```

**User Data Atributy (volitelné, ale doporučené):**
- `data-user-id` - ID uživatele v systému klienta
- `data-firstname` - Křestní jméno
- `data-lastname` - Příjmení
- `data-email` - Email
- `data-position` - Pozice/Role

**Důležité:**
- User data se ukládají do Supabase v `message_data.user_info`
- Data jsou přístupná v N8N webhooku v `payload.user` objektu
- Pokud uživatelská data nejsou dostupná, vynechte `data-*` atributy a JavaScript - chat bude fungovat normálně

### Varianta B: S tlačítkem pro otevření/zavření

```html
<!-- Toggle tlačítko -->
<button id="wany-chat-toggle" style="position:fixed; right:24px; bottom:24px; width:60px; height:60px; 
        border-radius:50%; background:#2563eb; color:white; border:none; 
        box-shadow:0 10px 25px rgba(0,0,0,0.2); cursor:pointer; z-index:999998; font-size:24px;">
  💬
</button>

<!-- Iframe (skrytý na začátku) -->
<iframe 
  id="wany-chat-iframe"
  src="https://medbase.cz/embed.html"
  allow="clipboard-write"
  title="Wany Chat"
  style="position:fixed; right:24px; bottom:24px; width:1200px; height:700px; 
         border:0; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); 
         z-index:999999; display:none;"
  data-user-id="<?php echo $user->id; ?>"
  data-firstname="<?php echo $user->firstName; ?>"
  data-lastname="<?php echo $user->lastName; ?>"
  data-email="<?php echo $user->email; ?>"
  data-position="<?php echo $user->position; ?>"
></iframe>

<script>
  const toggleBtn = document.getElementById('wany-chat-toggle');
  const chatIframe = document.getElementById('wany-chat-iframe');
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
        position: chatIframe.getAttribute('data-position')
      }
    }, 'https://medbase.cz');
  });
</script>
```

### Varianta C: Responsivní (desktop + mobile)

```html
<style>
  #wany-chat-iframe {
    position: fixed;
    z-index: 999999;
    border: 0;
  }

  /* Desktop */
  @media (min-width: 769px) {
    #wany-chat-iframe {
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
    #wany-chat-iframe {
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
  }
</style>

<iframe 
  id="wany-chat-iframe"
  src="https://medbase.cz/embed.html"
  allow="clipboard-write"
  title="Wany Chat"
></iframe>
```

---

## 🔒 Bezpečnost a konfigurace

### Supabase RLS (Row Level Security)

Ujisti se že `chatbot_settings` má veřejný read access:

```sql
-- Vytvoř policy v Supabase Dashboard
CREATE POLICY "Allow public read for vany_chat"
ON chatbot_settings FOR SELECT
USING (chatbot_id = 'vany_chat');
```

### N8N Webhook

Webhook musí být veřejně dostupný:
```
https://n8n.sanaai.cz/webhook/chat-vany
```

Test:
```bash
curl -X POST https://n8n.sanaai.cz/webhook/chat-vany \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "chatHistory": []}'
```

### CORS hlavičky

Pro přístup k Supabase API z jiných domén:

V Supabase Dashboard → Authentication → URL Configuration:
- Přidej `https://klient-domena.cz` do **Site URL** whitelist

---

## 🐛 Troubleshooting

### Problém: Iframe se nezobrazuje (prázdné okno)

**Symptom:** Iframe element existuje v DOM, ale je prázdný/bílý.

**Příčina:** Server blokuje iframe embedding pomocí CSP hlaviček.

**Řešení:**

1. **Zkontroluj CSP hlavičky:**
   ```bash
   curl -I https://medbase.cz/embed.html | grep -i "content-security\|x-frame"
   ```

2. **Otevři Developer Tools (F12) → Console:**
   Hledej chybu:
   ```
   Refused to display 'https://medbase.cz/embed.html' in a frame because it set 'X-Frame-Options' to 'sameorigin'.
   ```

3. **Oprava:**
   - Přidej CSP hlavičku do serveru (viz [Konfigurace serveru](#konfigurace-serveru))
   - Restart serveru
   - Vyčisti cache (`Ctrl+Shift+R`)

### Problém: "Tailwind CDN should not be used in production"

**Symptom:** Warning v konzoli.

**Příčina:** V `embed.html` je použit Tailwind CDN.

**Řešení:**

1. **Vybuduj Tailwind do CSS:**
   ```bash
   npm install -D tailwindcss
   npx tailwindcss -o dist/embed-styles.css --minify
   ```

2. **V `embed.html` nahraď:**
   ```html
   <!-- Místo CDN -->
   <script src="https://cdn.tailwindcss.com"></script>
   
   <!-- Použij lokální CSS -->
   <link rel="stylesheet" href="/embed-styles.css">
   ```

### Problém: Chat nefunguje, N8N nepřijímá zprávy

**Symptom:** Zprávy se neposílají, nebo N8N vrací chybu 500.

**Diagnóza:**

1. **Otevři Developer Tools → Network:**
   - Hledej POST request na `https://n8n.sanaai.cz/webhook/chat-vany`
   - Zkontroluj Status Code a Response

2. **Zkontroluj payload:**
   ```javascript
   {
     "message": "...",
     "chatHistory": [...],
     "metadata": {
       "categories": ["TČM", "Wany"],
       "labels": [],
       "publication_types": [...]
     }
   }
   ```

**Řešení:**
- Ověř že N8N webhook je aktivní
- Zkontroluj firewall/CORS nastavení na N8N serveru
- Test webhook přímo:
  ```bash
  curl -X POST https://n8n.sanaai.cz/webhook/chat-vany \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
  ```

### Problém: Filtry zobrazují špatné kategorie

**Symptom:** Zobrazují se všechny kategorie, nebo žádné.

**Příčina:** `allowed_categories` v databázi nejsou správně nastavené.

**Řešení:**

1. **Zkontroluj Supabase:**
   ```sql
   SELECT * FROM chatbot_settings WHERE chatbot_id = 'vany_chat';
   ```

2. **Ujisti se že:**
   ```json
   {
     "allowed_categories": ["UUID-TCM", "UUID-WANY"],
     "allowed_labels": [],
     "allowed_publication_types": ["UUID1", "UUID2", ...]
   }
   ```

3. **UUID najdeš v:**
   ```sql
   SELECT id, name FROM categories WHERE name IN ('TČM', 'Wany');
   ```

### Problém: Responsivita nefunguje na mobilu

**Symptom:** Na mobilu se chat zobrazuje stejně jako na desktopu.

**Řešení:**

Přidej meta viewport tag do hlavičky klientovy stránky:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## 📞 Kontakt a podpora

Pro technickou podporu:
- **Email:** podpora@bewit.love
- **Documentation:** [GitHub Wiki](https://github.com/bewit/medbase)

---

## 📝 Changelog

### v1.0.0 (2026-01-05)
- ✅ Iframe embedding s CSP hlavičkami
- ✅ Filtry: pouze TČM a Wany
- ✅ Štítky skryté na frontendu
- ✅ Responsivní design
- ✅ N8N webhook integrace
- ✅ Supabase public access

---

**🎉 Wany Chat je ready pro nasazení u klientů!**





