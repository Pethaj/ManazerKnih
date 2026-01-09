# 🚀 EO-Smesi Chatbot - Rychlý Start

## 📦 Co bylo vytvořeno

✅ **SQL script** pro přidání chatbota  
✅ **Node.js script** pro přidání chatbota  
✅ **SQL ověřovací script** pro kontrolu  
✅ **Kompletní dokumentace**  

---

## ⚡ Rychlé přidání (2 minuty)

### Varianta A: SQL (Doporučeno)

1. Otevři [Supabase Dashboard](https://supabase.com)
2. SQL Editor → New Query
3. Zkopíruj obsah `add_eo_smesi_chatbot.sql`
4. Klikni **RUN**
5. Zkontroluj výsledek v tabulce

### Varianta B: Node.js

```bash
node add_eo_smesi_chatbot.js
```

---

## ✅ Ověření

Spusť ověřovací script:

```bash
# V Supabase SQL Editoru
# Zkopíruj a spusť: verify_eo_smesi_chatbot.sql
```

Očekávaný výsledek: `✅ EO-Smesi chatbot je AKTIVNÍ a PŘIPRAVENÝ`

---

## 🔧 Konfigurace

### Nastavení (stejné jako Wany Chat)

```
chatbot_id: eo_smesi
chatbot_name: EO-Smesi
webhook_url: https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
is_active: true
book_database: true
product_recommendations: false
```

### Webhooky

**Odpovědi uživatele (unikátní pro EO-Smesi):**
```
https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
```

**Produktový funnel (sdílený):**
```
https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat
```

---

## 📚 Podrobná dokumentace

Viz soubor: `PRIDANI_EO_SMESI_CHATBOTA.md`

---

## 🐛 Problémy?

### Chatbot se nepřidává
- Zkontroluj admin přístup k Supabase
- Ověř, že tabulka `chatbot_settings` existuje

### Webhook nefunguje
- Test webhook přes curl (viz dokumentace)
- Ověř, že N8N workflow je aktivní

### Chatbot není v UI
- Zkontroluj `is_active = true` v databázi
- Vyčisti browser cache
- Restart aplikace

---

## 📝 Soubory

| Soubor | Účel |
|--------|------|
| `add_eo_smesi_chatbot.sql` | Přidání chatbota (SQL) |
| `add_eo_smesi_chatbot.js` | Přidání chatbota (Node.js) |
| `verify_eo_smesi_chatbot.sql` | Ověření instalace |
| `PRIDANI_EO_SMESI_CHATBOTA.md` | Kompletní dokumentace |
| `EO_SMESI_QUICK_START.md` | Tento soubor |

---

**Vytvořeno:** 2026-01-09


