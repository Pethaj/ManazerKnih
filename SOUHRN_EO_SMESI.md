# 📊 Souhrn: Přidání chatbota EO-Smesi

## ✅ Hotovo!

Byl připraven kompletní balíček pro přidání nového chatbota **"EO-Smesi"** do systému správy chatbotů.

---

## 📦 Vytvořené soubory

### 1. `add_eo_smesi_chatbot.sql`
**Typ:** SQL script  
**Účel:** Přidání chatbota přes Supabase SQL Editor  
**Použití:**
```
1. Otevři Supabase Dashboard
2. SQL Editor → New Query
3. Zkopíruj obsah souboru
4. Klikni RUN
```

### 2. `add_eo_smesi_chatbot.js`
**Typ:** Node.js script  
**Účel:** Alternativní způsob přidání chatbota přes JavaScript  
**Použití:**
```bash
node add_eo_smesi_chatbot.js
```

### 3. `verify_eo_smesi_chatbot.sql`
**Typ:** SQL ověřovací script  
**Účel:** Komplexní kontrola, že chatbot byl správně přidán  
**Co kontroluje:**
- ✅ Základní info o chatbotu
- ✅ Kompletní nastavení
- ✅ Porovnání s Wany Chat
- ✅ Seznam všech aktivních chatbotů
- ✅ Kontrola kategorií
- ✅ Kontrola typů publikací
- ✅ Kontrola shody nastavení
- ✅ Finální status check

### 4. `PRIDANI_EO_SMESI_CHATBOTA.md`
**Typ:** Kompletní dokumentace  
**Obsah:**
- 📋 Přehled a specifikace
- 🚀 Metoda 1: SQL Editor (krok za krokem)
- 🔧 Metoda 2: Node.js script
- ⚙️ Detailní popis nastavení
- 🔗 Informace o webhookách
- ✅ Checklist pro ověření
- 🧪 Testovací procedury
- 🐛 Troubleshooting
- 📚 Reference na související soubory

### 5. `EO_SMESI_QUICK_START.md`
**Typ:** Rychlý průvodce  
**Obsah:**
- ⚡ Rychlé přidání (2 minuty)
- ✅ Jednoduchá ověření
- 🔧 Základní konfigurace
- 🐛 Rychlé řešení problémů
- 📝 Přehled souborů

### 6. `SOUHRN_EO_SMESI.md`
**Typ:** Tento soubor  
**Účel:** Přehled všeho, co bylo vytvořeno

---

## 🎯 Specifikace chatbota

### Identifikace
```
chatbot_id: eo_smesi
chatbot_name: EO-Smesi
description: AI asistent s plným přístupem k databázi knih a pokročilým markdown renderingem
```

### Nastavení (identické s Wany Chat)
```yaml
product_recommendations: false
product_button_recommendations: false
book_database: true
is_active: true
use_feed_1: true
use_feed_2: true
inline_product_links: false
enable_product_router: true
enable_manual_funnel: false
allowed_categories: ALL (všechny kategorie)
allowed_publication_types: ALL (všechny typy publikací)
```

### Webhooky

#### Webhook pro odpovědi uživatele (UNIKÁTNÍ)
```
https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
```
- Tento webhook je **specifický** pro EO-Smesi
- Liší se od Wany Chat webhooку
- Uložen v poli `webhook_url` v databázi

#### Webhook pro produktový funnel (SDÍLENÝ)
```
https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat
```
- Tento webhook je **společný** pro všechny chatboty
- Hardcoded v `src/components/ManualFunnelButton.tsx`
- Používá se pro produktová doporučení

---

## 🚀 Jak přidat chatbota

### Rychlý způsob (SQL)

```sql
-- V Supabase SQL Editoru spusť:
-- add_eo_smesi_chatbot.sql
```

### Alternativní způsob (Node.js)

```bash
node add_eo_smesi_chatbot.js
```

---

## ✅ Ověření

```sql
-- V Supabase SQL Editoru spusť:
-- verify_eo_smesi_chatbot.sql
```

**Očekávaný výsledek:**
```
✅ EO-Smesi chatbot je AKTIVNÍ a PŘIPRAVENÝ
```

---

## 🔄 Porovnání s Wany Chat

| Vlastnost | Wany Chat | EO-Smesi | Rozdíl |
|-----------|-----------|----------|--------|
| `chatbot_id` | `vany_chat` | `eo_smesi` | ✅ Jiný |
| `chatbot_name` | `Vany.chat` | `EO-Smesi` | ✅ Jiný |
| `webhook_url` | `...22856d03.../chat` | `...20826009.../chat` | ✅ Jiný |
| `product_recommendations` | `false` | `false` | ✅ Stejný |
| `book_database` | `true` | `true` | ✅ Stejný |
| `is_active` | `true` | `true` | ✅ Stejný |
| Kategorie | ALL | ALL | ✅ Stejný |
| Typy publikací | ALL | ALL | ✅ Stejný |
| Produktový funnel webhook | Sdílený | Sdílený | ✅ Stejný |

**Závěr:** EO-Smesi je **identická kopie** Wany Chat s jiným ID, názvem a webhook URL pro odpovědi.

---

## 📊 Datový tok

### 1. Uživatel pošle zprávu do EO-Smesi

```
Uživatel → Frontend → Backend → N8N Webhook (EO-Smesi specifický)
```

**Webhook URL:**
```
https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
```

**Payload:**
```json
{
  "sessionId": "...",
  "action": "sendMessage",
  "chatInput": "...",
  "chatHistory": [...],
  "metadata": {...}
}
```

### 2. N8N zpracuje a vrátí odpověď

```
N8N → AI Model → Vektorová databáze → Odpověď s zdroji
```

**Response:**
```json
{
  "output": "AI odpověď",
  "sources": [...]
}
```

### 3. Uživatel klikne na produktový funnel

```
Uživatel → ManualFunnelButton → N8N Webhook (sdílený)
```

**Webhook URL:**
```
https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat
```

**Payload:**
```json
{
  "sessionId": "...",
  "action": "manualFunnel",
  "products": [...],
  "chatHistory": [...]
}
```

---

## 🧪 Testování

### Test 1: SQL kontrola
```sql
SELECT * FROM chatbot_settings WHERE chatbot_id = 'eo_smesi';
```

### Test 2: Webhook test
```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","action":"sendMessage","chatInput":"test"}'
```

### Test 3: UI test
1. Otevři aplikaci
2. Vyber chatbot "EO-Smesi"
3. Pošli testovací zprávu
4. Ověř, že přijde odpověď

---

## 🐛 Možné problémy a řešení

### ❌ Chatbot se nepřidává

**Příčina:** Chybějící práva  
**Řešení:**
```sql
-- Zkontroluj RLS policies
SELECT * FROM pg_policies WHERE tablename = 'chatbot_settings';
```

### ❌ Webhook nefunguje

**Příčina:** N8N workflow není aktivní  
**Řešení:**
1. Otevři N8N
2. Najdi workflow s tímto webhookem
3. Aktivuj jej

### ❌ Chatbot není v UI

**Příčina:** Cache  
**Řešení:**
1. Vyčisti browser cache (Ctrl + Shift + Delete)
2. Hard reload (Ctrl + Shift + R)
3. Restartuj aplikaci

---

## 📚 Dokumentace

### Pro uživatele
- `EO_SMESI_QUICK_START.md` - Rychlý start (2 min)

### Pro vývojáře
- `PRIDANI_EO_SMESI_CHATBOTA.md` - Kompletní dokumentace

### Pro administrátory
- `add_eo_smesi_chatbot.sql` - SQL script
- `verify_eo_smesi_chatbot.sql` - Ověřovací script

---

## 🎉 Hotovo!

Chatbot **EO-Smesi** je připraven k přidání do systému. Stačí spustit jeden z připravených scriptů a ověřit instalaci.

**Doporučený postup:**
1. Spusť `add_eo_smesi_chatbot.sql` v Supabase SQL Editoru
2. Spusť `verify_eo_smesi_chatbot.sql` pro ověření
3. Otestuj v aplikaci

**Čas instalace:** ~2 minuty  
**Složitost:** Nízká  
**Riziko:** Minimální (pouze přidání, žádná změna existujících dat)

---

**Vytvořeno:** 2026-01-09  
**Autor:** Cursor AI Assistant  
**Verze:** 1.0


