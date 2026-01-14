# 🔴 Wany.Chat Local - Dokumentace

## 📚 Přehled

**Wany.Chat Local** je nový chatbot s identickou konfigurací jako Wany.Chat, ale s:
- 🔴 **Červenou ikonkou** (místo modré)
- 🔗 **Jiným webhook URL**: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`

## 📖 Dokumenty

### 🚀 Pro rychlou instalaci
- **`INSTALL_WANY_CHAT_LOCAL.md`** - 3 kroky k instalaci (⏱️ 2 minuty)

### 📋 Pro základní informace
- **`WANY_CHAT_LOCAL_QUICK_START.md`** - Rychlý přehled a základní troubleshooting

### 🔧 Pro podrobnou instalaci
- **`WANY_CHAT_LOCAL_SETUP.md`** - Kompletní průvodce s technickými detaily

### 👨‍💻 Pro vývojáře
- **`WANY_CHAT_LOCAL_IMPLEMENTATION.md`** - Souhrn všech změn v kódu

## 📂 Instalační soubory

### SQL script (doporučeno)
```
add_wany_chat_local.sql
```
→ Spusť v Supabase SQL Editor

### JavaScript script
```
add_wany_chat_local.js
```
→ Spusť: `node add_wany_chat_local.js`

## 🎯 Co bylo změněno

### Nové soubory (5)
1. `add_wany_chat_local.sql` - SQL instalační script
2. `add_wany_chat_local.js` - JavaScript instalační script
3. `WANY_CHAT_LOCAL_QUICK_START.md`
4. `WANY_CHAT_LOCAL_SETUP.md`
5. `WANY_CHAT_LOCAL_IMPLEMENTATION.md`

### Upravené soubory (2)
1. `src/components/ChatbotSelector/ChatbotSelector.tsx` - červená ikona
2. `src/components/SanaChat/SanaChat.tsx` - markdown podpora

## ⚡ Rychlá instalace

```bash
# 1. Spusť SQL script v Supabase
#    (zkopíruj obsah add_wany_chat_local.sql)

# 2. Ověř instalaci
SELECT chatbot_id, chatbot_name 
FROM chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';

# 3. Obnov aplikaci (Ctrl+R)
```

## ✅ Ověření funkčnosti

Po instalaci zkontroluj:
- [ ] Chatbot se zobrazuje v selectoru
- [ ] Ikona je červená (ne modrá)
- [ ] Hover efekt je červený
- [ ] Webhook URL je: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`

## 📊 Porovnání s Wany.Chat

| Vlastnost | Wany.Chat | Wany.Chat Local |
|-----------|-----------|-----------------|
| Ikona | 🔵 Modrá | 🔴 Červená |
| Webhook | Původní | Nový (viz výše) |
| Nastavení | ✅ | ✅ Shodné |

## 🐛 Problém?

1. **Chatbot se nezobrazuje**
   ```sql
   UPDATE chatbot_settings 
   SET is_active = true 
   WHERE chatbot_id = 'wany_chat_local';
   ```

2. **Ikona není červená**
   - Vyčistěte cache (Ctrl+Shift+R)
   - Ověřte, že změny v `ChatbotSelector.tsx` jsou nasazeny

3. **Webhook nefunguje**
   - Zkontrolujte N8N workflow
   - Ověřte webhook URL v databázi

## 📞 Kontakt

Pro více informací viz:
- `WANY_CHAT_LOCAL_SETUP.md` - podrobná dokumentace
- `WANY_CHAT_LOCAL_IMPLEMENTATION.md` - technické detaily

---

**Vytvořeno:** 2026-01-14  
**Verze:** 1.0  
**Status:** ✅ Připraveno k použití
