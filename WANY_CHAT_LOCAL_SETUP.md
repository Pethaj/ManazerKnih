# 🔴 Wany.Chat Local - Instalační průvodce

## 📋 Přehled

**Wany.Chat Local** je nový chatbot s identickou konfigurací jako **Wany.Chat**, ale s těmito rozdíly:

- 🔴 **Červená ikona** místo modré
- 🔗 **Jiný webhook URL**: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`
- 🏷️ **Název**: Wany.Chat Local
- 🆔 **ID**: `wany_chat_local`

## ⚙️ Konfigurace

### Nastavení chatbota (shodné s Wany.Chat)

| Funkce | Hodnota | Popis |
|--------|---------|-------|
| `product_recommendations` | `false` | Produktová doporučení vypnuta |
| `product_button_recommendations` | `false` | Produktové tlačítko vypnuto |
| `book_database` | `true` | Databáze knih zapnuta |
| `allowed_categories` | Všechny | Všechny kategorie povoleny |
| `allowed_publication_types` | Všechny | Všechny typy publikací povoleny |
| `webhook_url` | `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat` | N8N webhook pro lokální verzi |
| `is_active` | `true` | Chatbot je aktivní |
| `use_feed_1` | `true` | Použít Feed 1 (zbozi.xml) |
| `use_feed_2` | `true` | Použít Feed 2 (Product Feed 2) |
| `inline_product_links` | `false` | Inline produktové linky vypnuty |
| `enable_product_router` | `true` | Produktový router zapnut |
| `enable_manual_funnel` | `false` | Manuální funnel vypnutý |

## 🚀 Instalace

### Krok 1: Přidání chatbota do databáze

1. Otevřete **Supabase SQL Editor**
2. Zkopírujte obsah souboru `add_wany_chat_local.sql`
3. Spusťte SQL script
4. Ověřte, že chatbot byl úspěšně vytvořen:

```sql
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    is_active
FROM public.chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';
```

**Očekávaný výsledek:**

| chatbot_id | chatbot_name | webhook_url | is_active |
|------------|--------------|-------------|-----------|
| wany_chat_local | Wany.Chat Local | https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat | true |

### Krok 2: Ověření v aplikaci

1. Obnovte aplikaci v prohlížeči (Ctrl+R / Cmd+R)
2. Otevřete selector chatbotů
3. Ověřte, že se zobrazuje **Wany.Chat Local** s 🔴 **červenou ikonkou**

## 🎨 Technické detaily

### Červená ikona

Ikona chatbota je automaticky nastavena na červenou barvu v komponentě `ChatbotSelector.tsx`:

```typescript
const getChatbotIconColor = (chatbotId: string): string => {
  // Wany.Chat Local má červenou ikonu
  if (chatbotId === 'wany_chat_local') {
    return '#dc3545'; // Červená
  }
  // Všechny ostatní mají modrou ikonu
  return '#2563eb'; // bewit-blue
};
```

### Markdown rendering

Chatbot automaticky podporuje pokročilý markdown rendering (stejně jako Wany.Chat):

```typescript
const usesMarkdown = chatbotId === 'sana_local_format' 
  || chatbotId === 'vany_chat' 
  || chatbotId === 'eo_smesi' 
  || chatbotId === 'wany_chat_local';
```

## 🔧 Správa chatbota

### Změna nastavení

1. Otevřete **Správa chatbotů** (🤖 tlačítko v hlavní liště)
2. Najděte **Wany.Chat Local**
3. Upravte nastavení podle potřeby
4. Klikněte **"Uložit nastavení"**

### Změna webhook URL

Pokud potřebujete změnit webhook URL:

```sql
UPDATE public.chatbot_settings 
SET webhook_url = 'https://novy-webhook-url.com/chat'
WHERE chatbot_id = 'wany_chat_local';
```

## 📊 Porovnání s Wany.Chat

| Vlastnost | Wany.Chat | Wany.Chat Local |
|-----------|-----------|-----------------|
| Chatbot ID | `vany_chat` | `wany_chat_local` |
| Název | Wany.Chat | Wany.Chat Local |
| Ikona | 🔵 Modrá | 🔴 Červená |
| Webhook | `https://n8n.srv980546.hstgr.cloud/webhook/...` (původní) | `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat` |
| Nastavení | Shodné | Shodné |

## 🧪 Testování

### Test 1: Zobrazení v selectoru

1. Otevřete aplikaci
2. Klikněte na selector chatbotů
3. Ověřte:
   - ✅ Zobrazuje se **Wany.Chat Local**
   - ✅ Ikona je **červená** (ne modrá)
   - ✅ Hover efekt je červený (ne modrý)

### Test 2: Funkčnost chatu

1. Vyberte **Wany.Chat Local** ze selectoru
2. Zadejte testovací zprávu
3. Ověřte:
   - ✅ Zpráva se odeslala na správný webhook
   - ✅ Markdown rendering funguje
   - ✅ Databáze knih je dostupná

### Test 3: Webhook komunikace

Sledujte N8N webhook logy na:
```
https://n8n.srv980546.hstgr.cloud/workflow/...
```

Ověřte, že příchozí zprávy obsahují:
```json
{
  "chatbot_id": "wany_chat_local",
  "message": "...",
  "metadata": { ... }
}
```

## 🐛 Řešení problémů

### Chatbot se nezobrazuje v selectoru

1. Zkontrolujte, že je chatbot aktivní:
   ```sql
   SELECT chatbot_id, is_active 
   FROM chatbot_settings 
   WHERE chatbot_id = 'wany_chat_local';
   ```

2. Pokud je `is_active = false`, aktivujte ho:
   ```sql
   UPDATE chatbot_settings 
   SET is_active = true 
   WHERE chatbot_id = 'wany_chat_local';
   ```

### Ikona není červená

1. Vyčistěte cache prohlížeče (Ctrl+Shift+R / Cmd+Shift+R)
2. Zkontrolujte, že kód v `ChatbotSelector.tsx` obsahuje funkci `getChatbotIconColor`
3. Ověřte, že chatbot má správné `chatbot_id`:
   ```sql
   SELECT chatbot_id FROM chatbot_settings WHERE chatbot_name = 'Wany.Chat Local';
   ```

### Webhook nefunguje

1. Zkontrolujte webhook URL v databázi:
   ```sql
   SELECT webhook_url FROM chatbot_settings WHERE chatbot_id = 'wany_chat_local';
   ```

2. Ověřte, že webhook je dostupný:
   ```bash
   curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat \
     -H "Content-Type: application/json" \
     -d '{"test": "message"}'
   ```

## 📚 Související dokumentace

- `CHATBOT_MANAGEMENT_GUIDE.md` - Obecný průvodce správou chatbotů
- `add_wany_chat_local.sql` - SQL script pro instalaci
- `ChatbotSelector.tsx` - Komponenta pro výběr chatbotů s barevnými ikonami
- `SanaChat.tsx` - Hlavní komponenta chatu s markdown podporou

## ✅ Checklist nasazení

- [ ] SQL script spuštěn v Supabase
- [ ] Chatbot se zobrazuje v selectoru
- [ ] Ikona je červená
- [ ] Hover efekty fungují (červené, ne modré)
- [ ] Chat odesílá zprávy na správný webhook
- [ ] Markdown rendering funguje
- [ ] Databáze knih je dostupná
- [ ] Všechny kategorie a typy publikací jsou povoleny

---

**Vytvořeno:** 2026-01-14  
**Autor:** Cursor AI  
**Verze:** 1.0
