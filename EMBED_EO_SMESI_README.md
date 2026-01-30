# 🌿 EO Směsi Chat Embed - README

> **Embeddable chat widget pro esenciální oleje a směsi BEWIT**

## 🎯 Co to je?

EO Směsi Chat je iframe widget, který umožňuje vložit plně funkční AI chatbot o esenciálních olejích na jakýkoliv web (konkrétně Bewit.cz). Widget je **100% identický** s VanyChat embedem, ale používá dedikovaný chatbot `eo_smesi` s vlastním N8N webhookem.

## ⚡ Quick Links

| Dokument | Účel | Pro koho |
|----------|------|----------|
| **[QUICK START](EMBED_EO_SMESI_QUICK_START.md)** | Rychlý start v 5 minutách | Vývojáři |
| **[DEPLOYMENT GUIDE](EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md)** | Kompletní průvodce nasazením | Vývojáři |
| **[IMPLEMENTATION SUMMARY](EMBED_EO_SMESI_IMPLEMENTATION_SUMMARY.md)** | Technické detaily implementace | Vývojáři |
| **[KLIENT PŘÍKLAD](public/widgets/klient-eo-smesi-iframe-priklad.html)** | Embedding kód pro Bewit | Bewit tým |

## 🚀 Jak začít

### Pro vývojáře (lokální vývoj)

```bash
# 1. Spusť dev server
npm run dev

# 2. Otevři test stránku
open http://localhost:5173/public/widgets/test-eo-smesi-embed.html
```

### Pro klienta (Bewit)

```html
<!-- Vlož před </body> tag -->
<iframe
  id="eo-smesi-chat-iframe"
  src="https://gr8learn.eu/embed-eo-smesi.html"
  data-user-id="<?php echo $user->id; ?>"
  data-email="<?php echo $user->email; ?>"
  data-token-eshop="<?php echo $user->bewitToken; ?>"
  style="position:fixed;right:24px;bottom:24px;width:1200px;height:700px;border:0;border-radius:16px;z-index:999999"
></iframe>
```

Viz kompletní kód: [klient-eo-smesi-iframe-priklad.html](public/widgets/klient-eo-smesi-iframe-priklad.html)

## 📁 Struktura souborů

```
app/
├── src/
│   ├── pages/
│   │   └── EmbedEOSmesi.tsx              # Hlavní komponenta
│   └── embed-eo-smesi-entry.tsx          # Entry point
│
├── embed-eo-smesi.html                   # HTML wrapper
│
├── public/widgets/
│   ├── test-eo-smesi-embed.html          # Testovací stránka
│   └── klient-eo-smesi-iframe-priklad.html  # Kód pro Bewit
│
├── EMBED_EO_SMESI_README.md              # Tento soubor
├── EMBED_EO_SMESI_QUICK_START.md         # Rychlý start
├── EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md    # Deployment guide
└── EMBED_EO_SMESI_IMPLEMENTATION_SUMMARY.md  # Implementační summary
```

## 🔧 Technické info

| Vlastnost | Hodnota |
|-----------|---------|
| **Chatbot ID** | `eo_smesi` |
| **Webhook URL** | `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat` |
| **Dev URL** | `http://localhost:5173/embed-eo-smesi.html` |
| **Prod URL** | `https://gr8learn.eu/embed-eo-smesi.html` |
| **Databáze** | Supabase (`chatbot_settings`, `chat_messages`) |

## ✨ Funkce

- ✅ **100% parita s VanyChat** - všechny funkce identické
- ✅ **User data tracking** - ID, email, jméno, e-shop token
- ✅ **Supabase integrace** - automatické ukládání historie
- ✅ **N8N webhook** - dedikovaný endpoint pro EO Směsi
- ✅ **IFRAME_READY signál** - pro koordinaci načítání
- ✅ **PostMessage API** - bezpečný přenos dat
- ✅ **Data-* atributy** - jednoduchá implementace
- ✅ **Origin validation** - bezpečnostní kontroly
- ✅ **Fallback settings** - vždy funkční i bez DB
- ✅ **Responsivní** - desktop i mobile

## 🔄 Workflow

```
Bewit web (klient)
    ↓
    ↓ (iframe embed)
    ↓
EO Směsi Chat Widget
    ↓
    ↓ (user data + zpráva)
    ↓
N8N Webhook
    ↓
    ↓ (AI zpracování)
    ↓
Odpověď zpět do chatu
    ↓
    ↓ (ukládání)
    ↓
Supabase DB
```

## 📊 User Data Flow

```typescript
// Klientský web (data-* atributy)
<iframe
  data-user-id="123"
  data-email="jan@bewit.cz"
  data-token-eshop="abc123"
/>

// ↓

// EmbedEOSmesi.tsx načte data
const userData = {
  id: iframe.dataset.userId,
  email: iframe.dataset.email,
  tokenEshop: iframe.dataset.tokenEshop
}

// ↓

// Předá do SanaChat komponenty
<FilteredSanaChat 
  externalUserInfo={userData}
/>

// ↓

// Ukládá do Supabase
chat_messages.message_data.user_info = {
  external_user_id: "123",
  email: "jan@bewit.cz",
  token_eshop: "abc123"
}

// ↓

// Odesílá do N8N
POST https://n8n...20826009-b007.../chat
{
  user: { id: "123", email: "jan@bewit.cz", ... }
}
```

## 🐛 Troubleshooting

| Problém | Řešení |
|---------|--------|
| Iframe se nezobrazuje | Zkontroluj CSP hlavičky: `curl -I https://gr8learn.eu/embed-eo-smesi.html` |
| User data nefungují | Otevři Console → hledej `📋 User data načtena...` |
| N8N neodpovídá | Test webhook: `curl -X POST https://n8n...20826009-b007.../chat` |
| DB chyba | Zkontroluj: `SELECT * FROM chatbot_settings WHERE chatbot_id = 'eo_smesi'` |

Více viz: [Troubleshooting sekce v Deployment Guide](EMBED_EO_SMESI_DEPLOYMENT_GUIDE.md#troubleshooting)

## 📝 Build & Deploy

```bash
# Build
npm run build

# Výstup
dist/embed-eo-smesi.html
dist/assets/embed-eo-smesi-*.js
dist/assets/embed-eo-smesi-*.css

# Deploy
scp -r dist/* user@gr8learn.eu:/var/www/gr8learn/
ssh user@gr8learn.eu "sudo systemctl restart nginx"

# Test
curl -I https://gr8learn.eu/embed-eo-smesi.html
```

## ✅ Checklist před nasazením

- [ ] Lokální test funguje
- [ ] Build projde bez chyb
- [ ] CSP hlavičky nastaveny
- [ ] Chatbot `eo_smesi` existuje v DB
- [ ] Webhook URL je správná
- [ ] RLS policies nastaveny
- [ ] User data se ukládají
- [ ] N8N odpovídá
- [ ] Produkční test OK

## 🔐 Bezpečnost

### Allowed Origins (PostMessage)
```typescript
[
  'https://www.bewit.cz',
  'https://bewit.cz',
  'https://mybewit.com',
  'https://www.mybewit.com'
]
```

### RLS Policies
```sql
-- Public read access
CREATE POLICY "Allow public read for eo_smesi"
ON chatbot_settings FOR SELECT
USING (chatbot_id = 'eo_smesi');
```

## 📞 Support

- **Email:** podpora@bewit.love
- **Docs:** Viz Quick Links výše
- **SQL verifikace:** `verify_eo_smesi_chatbot.sql`

## 🎯 Rozdíly vs VanyChat

| Vlastnost | VanyChat | EO Směsi |
|-----------|----------|----------|
| Chatbot ID | `vany_chat` | `eo_smesi` ✅ |
| Webhook | `...22856d03-acea...` | `...20826009-b007...` ✅ |
| HTML | `embed.html` | `embed-eo-smesi.html` ✅ |
| **VŠE OSTATNÍ** | ✅ | ✅ **IDENTICKÉ** |

## 📚 Další zdroje

- [VanyChat Deployment Guide](EMBED_DEPLOYMENT_GUIDE.md) - Pro referenci
- [Chatbot Database Setup](PRIDANI_EO_SMESI_CHATBOTA.md)
- [SQL Verifikace](verify_eo_smesi_chatbot.sql)

---

**Vytvořeno:** 2026-01-29  
**Status:** ✅ Připraveno k nasazení  
**Verze:** 1.0.0
