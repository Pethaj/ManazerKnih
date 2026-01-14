# 🔴 Wany.Chat Local - Rychlý start

## Co je Wany.Chat Local?

Nový chatbot **identický** s Wany.Chat, ale:
- 🔴 **Červená ikona** místo modré
- 🔗 Posílá na jiný webhook: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`

## 🚀 Instalace (vyberte jednu metodu)

### Metoda 1: SQL script (doporučeno)

1. Otevřete **Supabase SQL Editor**
2. Zkopírujte obsah souboru `add_wany_chat_local.sql`
3. Spusťte SQL script
4. ✅ Hotovo!

### Metoda 2: JavaScript script

```bash
node add_wany_chat_local.js
```

## ✅ Ověření

1. Obnovte aplikaci (Ctrl+R / Cmd+R)
2. Otevřete selector chatbotů
3. Ověřte, že vidíte **Wany.Chat Local** s 🔴 **červenou ikonkou**

## 📊 Porovnání

| Vlastnost | Wany.Chat | Wany.Chat Local |
|-----------|-----------|-----------------|
| Ikona | 🔵 Modrá | 🔴 Červená |
| Webhook | Původní | `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat` |
| Vše ostatní | ✅ Shodné | ✅ Shodné |

## 🐛 Problém?

Pokud se chatbot nezobrazuje, zkontrolujte:

```sql
SELECT chatbot_id, chatbot_name, is_active 
FROM chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';
```

Mělo by vrátit:
- `chatbot_id`: `wany_chat_local`
- `chatbot_name`: `Wany.Chat Local`
- `is_active`: `true`

---

📚 **Podrobná dokumentace:** `WANY_CHAT_LOCAL_SETUP.md`
