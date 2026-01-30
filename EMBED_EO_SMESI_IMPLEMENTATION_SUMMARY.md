# 📋 EO Směsi Chat Embed - Implementační Summary

## ✅ CO BYLO VYTVOŘENO

Datum: **2026-01-29**

### 🎯 Hlavní cíl
Vytvořit **embeddable chat widget** pro esenciální oleje a směsi BEWIT, který je **100% identický** s VanyChat embedem, ale používá chatbot `eo_smesi` s dedikovaným N8N webhookem.

---

## 📁 VYTVOŘENÉ SOUBORY

### 1. Frontend komponenty

#### `/src/pages/EmbedEOSmesi.tsx`
- **Účel:** Hlavní React komponenta pro EO Směsi embed
- **Chatbot ID:** `eo_smesi`
- **Fallback webhook:** `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat`
- **Funkce:**
  - ✅ Načítání nastavení z Supabase
  - ✅ User data tracking (data-* atributy)
  - ✅ PostMessage API
  - ✅ IFRAME_READY signál
  - ✅ Fallback nastavení
  - ✅ Origin validation

#### `/src/embed-eo-smesi-entry.tsx`
- **Účel:** Entry point pro Vite build
- **Import:** `EmbedEOSmesi` komponenta
- **Output:** Samostatný JavaScript bundle

### 2. HTML wrapper

#### `/embed-eo-smesi.html`
- **Účel:** HTML wrapper pro iframe embedding
- **Title:** "EO Směsi Chat"
- **Root element:** `#embed-root`
- **Tailwind:** CDN verze (pro dev)
- **Fonts:** Inter (Google Fonts)
- **Script:** `/src/embed-eo-smesi-entry.tsx`

### 3. Build konfigurace

#### `/vite.config.ts` (upraveno)
```typescript
input: {
  main: path.resolve(__dirname, 'index.html'),
  widget: path.resolve(__dirname, 'public/widgets/widget-chat.html'),
  embed: path.resolve(__dirname, 'embed.html'),
  embedEOSmesi: path.resolve(__dirname, 'embed-eo-smesi.html')  // 🆕 PŘIDÁNO
}
```

### 4. Testovací soubory

#### `/public/widgets/test-eo-smesi-embed.html`
- **Účel:** Testovací stránka pro lokální vývoj
- **Funkce:**
  - ✅ Iframe s data-* atributy
  - ✅ Toggle tlačítko
  - ✅ PostMessage test
  - ✅ IFRAME_READY listener
  - ✅ Dokumentace použití
  - ✅ Styling příklady

### 5. Dokumentace

#### `/EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md`
- **Obsah:**
  - Lokální vývoj
  - Build process
  - Server konfigurace (Nginx/Apache)
  - Klientská implementace (3 varianty)
  - User data tracking
  - IFRAME_READY signál
  - Bezpečnost
  - Troubleshooting
  - Monitoring queries

#### `/EMBED_EO_SMESI_QUICK_START.md`
- **Obsah:**
  - 5min rychlý start pro vývojáře
  - 2min implementace pro klienty
  - Rychlé řešení problémů
  - Klíčové URL

#### `/EMBED_EO_SMESI_IMPLEMENTATION_SUMMARY.md` (tento soubor)
- **Obsah:**
  - Přehled vytvořených souborů
  - Technické detaily
  - Checklist

---

## 🔧 TECHNICKÉ DETAILY

### Chatbot konfigurace

| Vlastnost | Hodnota |
|-----------|---------|
| **Chatbot ID** | `eo_smesi` |
| **Název** | EO-Smesi |
| **Webhook URL** | `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat` |
| **Databáze knih** | ✅ Zapnuto |
| **Produktová doporučení** | ❌ Vypnuto |
| **Use Feed 1** | ✅ Zapnuto |
| **Use Feed 2** | ✅ Zapnuto |
| **Inline product links** | ❌ Vypnuto |
| **Product router** | ✅ Zapnuto |
| **Manual funnel** | ❌ Vypnuto |
| **Allowed labels** | `[]` (prázdné v embed verzi) |

### User data tracking

Chat sbírá a ukládá:

```typescript
{
  id?: string;                // User ID z klientského systému
  email?: string;             // Email
  firstName?: string;         // Křestní jméno
  lastName?: string;          // Příjmení
  position?: string;          // Pozice/role
  tokenEshop?: string;        // E-shop token z Bewit
}
```

**Způsoby předání dat:**
1. **Data-* atributy** na iframe elementu (jednodušší)
2. **PostMessage API** (bezpečnější)
3. **Kombinace obou** (doporučeno)

**Ukládání:**
- Supabase: `chat_messages.message_data.user_info`
- N8N webhook: `payload.user`
- Filtrovatelné SQL queries

### IFRAME_READY signál

```javascript
// Iframe posílá signál rodičovskému oknu
window.parent.postMessage({ type: 'IFRAME_READY' }, '*');

// Rodič naslouchá
window.addEventListener('message', (event) => {
  if (event.data.type === 'IFRAME_READY') {
    // Iframe je připraven, můžeš poslat user data
  }
});
```

### Origin validation

Povolené originy pro postMessage:
```typescript
[
  'https://www.bewit.cz',
  'https://bewit.cz',
  'https://mybewit.com',
  'https://www.mybewit.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]
```

---

## 🎯 ROZDÍLY OPROTI VANYCHAT

| Vlastnost | VanyChat | EO Směsi Chat | Status |
|-----------|----------|---------------|--------|
| **Chatbot ID** | `vany_chat` | `eo_smesi` | ✅ Změněno |
| **Název** | "Wany Chat" | "EO Směsi Chat" | ✅ Změněno |
| **Webhook URL** | `...22856d03-acea.../chat` | `...20826009-b007.../chat` | ✅ Změněno |
| **HTML soubor** | `embed.html` | `embed-eo-smesi.html` | ✅ Změněno |
| **Entry point** | `embed-entry.tsx` | `embed-eo-smesi-entry.tsx` | ✅ Změněno |
| **Komponenta** | `EmbedVanyChat.tsx` | `EmbedEOSmesi.tsx` | ✅ Změněno |
| **Vite config** | `embed` | `embedEOSmesi` | ✅ Přidáno |
| **Iframe ID** | `wany-chat-iframe` | `eo-smesi-chat-iframe` | ✅ Změněno |
| **Test stránka** | `test-klient-embed.html` | `test-eo-smesi-embed.html` | ✅ Vytvořeno |
| **User data** | ✅ Stejné | ✅ Stejné | ✅ Identické |
| **PostMessage** | ✅ Stejné | ✅ Stejné | ✅ Identické |
| **IFRAME_READY** | ✅ Stejné | ✅ Stejné | ✅ Identické |
| **Origin validation** | ✅ Stejné | ✅ Stejné | ✅ Identické |
| **Supabase integrace** | ✅ Stejné | ✅ Stejné | ✅ Identické |
| **Fallback nastavení** | ✅ Ano | ✅ Ano | ✅ Identické |
| **Allowed labels** | `[]` | `[]` | ✅ Identické |
| **Chat funkce** | ✅ Vše | ✅ Vše | ✅ Identické |

**Závěr:** Všechny funkce jsou **100% identické**, změněny jsou pouze identifikátory a názvy.

---

## 🚀 JAK POUŽÍT

### Pro lokální vývoj

```bash
# 1. Spusť dev server
npm run dev

# 2. Otevři test stránku
open http://localhost:5173/public/widgets/test-eo-smesi-embed.html

# 3. Testuj funkce:
# - Klikni na toggle tlačítko
# - Pošli zprávu
# - Zkontroluj Console logy
# - Ověř user data v Supabase
```

### Pro produkci

```bash
# 1. Build
npm run build

# 2. Najdi soubory v dist/
ls -la dist/embed-eo-smesi*

# 3. Upload na server
scp -r dist/* user@gr8learn.eu:/var/www/gr8learn/

# 4. Restart serveru
ssh user@gr8learn.eu "sudo systemctl restart nginx"

# 5. Test
curl -I https://gr8learn.eu/embed-eo-smesi.html
```

### Pro klienta (Bewit)

```html
<!-- Vlož před </body> -->
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

---

## ✅ CHECKLIST PŘED NASAZENÍM

### Lokální development
- [x] Vytvořena komponenta `EmbedEOSmesi.tsx`
- [x] Vytvořen entry point `embed-eo-smesi-entry.tsx`
- [x] Vytvořen HTML wrapper `embed-eo-smesi.html`
- [x] Aktualizována `vite.config.ts`
- [x] Vytvořena testovací stránka
- [x] Vytvořena dokumentace

### Funkční testy
- [ ] Spuštěn `npm run dev`
- [ ] Otevřena test stránka
- [ ] Iframe se zobrazuje správně
- [ ] Toggle tlačítko funguje
- [ ] User data se načítají z data-* atributů
- [ ] PostMessage funguje
- [ ] IFRAME_READY signál se odesílá
- [ ] Zprávy se odesílají na N8N webhook
- [ ] Odpovědi přicházejí z N8N
- [ ] Data se ukládají do Supabase

### Databáze
- [ ] Chatbot `eo_smesi` existuje
- [ ] Webhook URL je správná
- [ ] RLS policies jsou nastavené
- [ ] Public read access funguje

### Build & Deploy
- [ ] `npm run build` projde bez chyb
- [ ] Soubor `dist/embed-eo-smesi.html` existuje
- [ ] JS bundle byl vytvořen
- [ ] CSS bundle byl vytvořen
- [ ] Upload na server
- [ ] CSP hlavičky nastavené
- [ ] Test produkční URL

### Produkční test
- [ ] Iframe se zobrazuje na `https://gr8learn.eu/embed-eo-smesi.html`
- [ ] CSP hlavičky povolují embedding
- [ ] User data fungují
- [ ] N8N webhook odpovídá
- [ ] Supabase ukládá zprávy
- [ ] Responsivní design na mobilu

---

## 🐛 ZNÁMÉ PROBLÉMY A ŘEŠENÍ

### Problém 1: Tailwind CDN warning
**Popis:** Console warning "Tailwind CDN should not be used in production"

**Řešení:** 
- V dev módu: Ignoruj (CDN je OK)
- V produkci: Build proces nahradí CDN za lokální CSS

### Problém 2: window.frameElement je null
**Popis:** Data-* atributy se nenačítají

**Příčina:** Některé browsery omezují přístup k `window.frameElement`

**Řešení:** Použij PostMessage API jako fallback (už implementováno)

### Problém 3: CORS error při volání Supabase
**Popis:** `Access-Control-Allow-Origin` error

**Řešení:**
1. Přidej origin do Supabase URL Configuration
2. Zkontroluj že origin je v `allowedOrigins` array

---

## 📊 MONITORING

### SQL queries pro kontrolu

```sql
-- Počet zpráv z EO Směsi chatu
SELECT COUNT(*) FROM chat_messages 
WHERE chatbot_id = 'eo_smesi';

-- Poslední zprávy s user daty
SELECT 
  message_text,
  message_data->'user_info'->>'email' as email,
  message_data->'user_info'->>'token_eshop' as token,
  created_at
FROM chat_messages 
WHERE chatbot_id = 'eo_smesi'
ORDER BY created_at DESC 
LIMIT 10;

-- Unikátní uživatelé
SELECT 
  COUNT(DISTINCT message_data->'user_info'->>'email') as unique_users
FROM chat_messages 
WHERE chatbot_id = 'eo_smesi';
```

### Console logy

**Úspěšné načtení:**
```
🔥 EMBED EO SMESI CHAT - Loading settings...
📋 User data načtena z data-* atributů iframe: {...}
✅ Chatbot settings loaded from DB: {...}
📤 Odesílám IFRAME_READY signál rodičovskému oknu...
✅ IFRAME_READY signál odeslán
```

**Na klientské stránce:**
```
✅ EO Směsi Chat iframe je připraven!
📤 User data odeslána přes postMessage
```

---

## 📚 SOUVISEJÍCÍ DOKUMENTACE

| Soubor | Účel |
|--------|------|
| `EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md` | Kompletní deployment guide |
| `EMBED_EO_SMESI_QUICK_START.md` | Rychlý start guide |
| `verify_eo_smesi_chatbot.sql` | SQL verifikace chatbota |
| `add_eo_smesi_chatbot.sql` | SQL pro přidání chatbota |
| `PRIDANI_EO_SMESI_CHATBOTA.md` | Dokumentace chatbota |
| `EMBED_DEPLOYMENT_GUIDE.md` | VanyChat deployment guide (reference) |

---

## 🎉 ZÁVĚR

**Status:** ✅ **HOTOVO - Připraveno k nasazení**

**Co bylo dosaženo:**
- ✅ Vytvořen kompletní embed systém pro EO Směsi chat
- ✅ 100% paritu s VanyChat
- ✅ Všechny funkce zrcadlí MedBase nastavení
- ✅ User data tracking včetně e-shop tokenu
- ✅ Supabase integrace
- ✅ N8N webhook integrace
- ✅ Testovací stránka
- ✅ Kompletní dokumentace

**Další kroky:**
1. Spusť lokální testy podle checklistu
2. Build a deploy na produkci
3. Test na produkční URL
4. Dodej kód klientovi (Bewit)

**Vytvořeno:** 2026-01-29  
**Autor:** AI Assistant  
**Review:** Čeká na review
