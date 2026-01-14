# ⚡ Rychlá instalace Wany.Chat Local

## 3 kroky k dokončení

### 1️⃣ Spusť SQL script

**Metoda A - Supabase SQL Editor (doporučeno):**
1. Otevři https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Zkopíruj celý obsah souboru `add_wany_chat_local.sql`
3. Klikni "Run"

**Metoda B - Node.js script:**
```bash
node add_wany_chat_local.js
```

### 2️⃣ Ověř instalaci

Spusť v Supabase SQL Editor:
```sql
SELECT chatbot_id, chatbot_name, webhook_url 
FROM chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';
```

**Očekávaný výsledek:**
| chatbot_id | chatbot_name | webhook_url |
|------------|--------------|-------------|
| wany_chat_local | Wany.Chat Local | https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat |

### 3️⃣ Test v aplikaci

1. Obnov aplikaci (Ctrl+R / Cmd+R)
2. Otevři selector chatbotů
3. Ověř:
   - ✅ Vidíš **Wany.Chat Local**
   - ✅ Ikona je **🔴 červená** (ne modrá)
   - ✅ Hover efekt je červený

## ✅ Hotovo!

Chatbot je připraven k použití.

---

**Problém?** → Viz `WANY_CHAT_LOCAL_SETUP.md` (sekce Troubleshooting)
