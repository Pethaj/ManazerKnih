# 🚀 EO Směsi Chat Embed - Rychlý Start

## ⚡ Pro vývojáře (5 minut)

### 1. Lokální test

```bash
# Spusť dev server
npm run dev

# Otevři testovací stránku
open http://localhost:5173/public/widgets/test-eo-smesi-embed.html
```

### 2. Build pro produkci

```bash
# Build
npm run build

# Výstup najdeš v:
dist/embed-eo-smesi.html
dist/assets/embed-eo-smesi-*.js
dist/assets/embed-eo-smesi-*.css
```

### 3. Nasazení

```bash
# Upload na server
scp -r dist/* user@gr8learn.eu:/var/www/gr8learn/

# Restart serveru
ssh user@gr8learn.eu "sudo systemctl restart nginx"
```

---

## 👨‍💼 Pro klienty (2 minuty)

### Kód pro vložení na web

Vlož před `</body>` tag:

```html
<!-- EO Směsi Chat -->
<iframe
  id="eo-smesi-chat-iframe"
  src="https://gr8learn.eu/embed-eo-smesi.html"
  data-user-id="<?php echo $user->id; ?>"
  data-firstname="<?php echo $user->firstName; ?>"
  data-lastname="<?php echo $user->lastName; ?>"
  data-email="<?php echo $user->email; ?>"
  data-position="<?php echo $user->position; ?>"
  data-token-eshop="<?php echo $user->tokenEshop; ?>"
  style="position:fixed;right:24px;bottom:24px;width:1200px;height:700px;border:0;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);z-index:999999"
></iframe>
```

### S toggle tlačítkem

```html
<button id="chat-toggle" onclick="toggleChat()">💬</button>
<iframe id="eo-smesi-chat-iframe" src="https://gr8learn.eu/embed-eo-smesi.html" style="display:none"></iframe>

<script>
function toggleChat() {
  const iframe = document.getElementById('eo-smesi-chat-iframe');
  iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
}
</script>
```

---

## ✅ Ověření

### Kontrola že chat funguje

1. Otevři web s embedem
2. Měl by se zobrazit chat
3. Pošli zprávu
4. Měl by přijít odpověď z N8N

### Kontrola user dat v Supabase

```sql
SELECT 
  message_data->'user_info'->>'email' as email,
  message_data->'user_info'->>'token_eshop' as token,
  created_at
FROM chat_messages 
WHERE chatbot_id = 'eo_smesi'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🐛 Rychlé řešení problémů

| Problém | Řešení |
|---------|--------|
| Iframe se nezobrazuje | Zkontroluj CSP hlavičky: `curl -I https://gr8learn.eu/embed-eo-smesi.html` |
| User data se neukládají | Otevři Console → hledej `📋 User data načtena...` |
| N8N nefunguje | Test webhook: `curl -X POST https://n8n...20826009-b007.../chat -d '{"message":"test"}'` |
| Chatbot nenačítá nastavení | Zkontroluj databázi: `SELECT * FROM chatbot_settings WHERE chatbot_id = 'eo_smesi'` |

---

## 📚 Další dokumentace

- **Kompletní guide:** `EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md`
- **User data:** Sekce "User Data Tracking" v deployment guide
- **Troubleshooting:** Sekce "Troubleshooting" v deployment guide
- **Supabase verifikace:** `verify_eo_smesi_chatbot.sql`

---

## 🎯 Klíčové URL

- **Dev:** `http://localhost:5173/embed-eo-smesi.html`
- **Prod:** `https://gr8learn.eu/embed-eo-smesi.html`
- **Test:** `http://localhost:5173/public/widgets/test-eo-smesi-embed.html`
- **Webhook:** `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat`

---

**Vytvořeno:** 2026-01-29  
**Status:** ✅ Připraveno k nasazení
