# 🚀 START HERE - Wany.Chat Local

## ✅ Vše je připraveno!

Nový chatbot **Wany.Chat Local** byl vytvořen a je připraven k instalaci.

## 🎯 Co máš udělat (3 kroky)

### 1. Spusť instalační script

**VARIANTA A - SQL (doporučeno, 2 minuty):**

1. Otevři Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Zkopíruj celý obsah souboru: **`add_wany_chat_local.sql`**
3. Vlož do SQL editoru a klikni **"Run"**
4. Měl by ses vidět úspěšné zprávy ✅

**VARIANTA B - Node.js:**
```bash
node add_wany_chat_local.js
```

### 2. Ověř v databázi

Spusť v SQL editoru:
```sql
SELECT chatbot_id, chatbot_name, webhook_url, is_active 
FROM chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';
```

**Měl bys vidět:**
```
chatbot_id       | chatbot_name      | webhook_url                                          | is_active
wany_chat_local  | Wany.Chat Local   | https://n8n.srv980546.hstgr.cloud/webhook/15f08...  | true
```

### 3. Ověř v aplikaci

1. **Obnov aplikaci** v prohlížeči: `Ctrl+R` (Windows) / `Cmd+R` (Mac)
2. **Otevři selector chatbotů** (klikni na ikonu chatu)
3. **Zkontroluj:**
   - ✅ Vidíš **"Wany.Chat Local"** v seznamu
   - ✅ Ikona je **🔴 červená** (NE modrá!)
   - ✅ Když najedeš myší, pozadí je červené (NE modré!)

## 🎉 Hotovo!

Pokud všechny 3 kroky proběhly v pořádku, chatbot je funkční!

## 📚 Další dokumentace

| Potřebuješ... | Otevři soubor... |
|---------------|------------------|
| 🚀 Rychlou instalaci | `INSTALL_WANY_CHAT_LOCAL.md` |
| 📋 Přehled všeho | `README_WANY_CHAT_LOCAL.md` |
| 🔧 Podrobný průvodce | `WANY_CHAT_LOCAL_SETUP.md` |
| 👨‍💻 Technické detaily | `WANY_CHAT_LOCAL_IMPLEMENTATION.md` |
| ✅ Souhrn změn | `SOUHRN_WANY_CHAT_LOCAL.md` |

## 🐛 Něco nefunguje?

### Chatbot se nezobrazuje
→ Spusť:
```sql
UPDATE chatbot_settings 
SET is_active = true 
WHERE chatbot_id = 'wany_chat_local';
```

### Ikona není červená
→ Vyčisti cache: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

### Víc problémů?
→ Otevři `WANY_CHAT_LOCAL_SETUP.md` → sekce "Řešení problémů"

## 📊 Co je nového?

✅ **Nový chatbot:** Wany.Chat Local  
✅ **Červená ikona:** Odlišná od Wany.Chat (modrá)  
✅ **Nový webhook:** `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`  
✅ **Shodné nastavení:** Stejné jako Wany.Chat (databáze knih, všechny kategorie, markdown, atd.)

---

**Začni zde:** ↑ **Krok 1** ↑  
**Potřebuješ pomoc?** → Otevři `WANY_CHAT_LOCAL_SETUP.md`
