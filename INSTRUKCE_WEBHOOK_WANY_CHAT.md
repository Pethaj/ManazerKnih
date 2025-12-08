# 🔗 Nastavení Webhook URL pro Wany.Chat

## 📋 Přehled

Chatbot **Wany.Chat** byl úspěšně přidán do databáze, ale potřebuje mít nastaven webhook URL, na který bude posílat konverzace s metadaty.

**Webhook URL pro Wany.Chat:**
```
https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat
```

---

## 🚀 Jak nastavit Webhook URL

### Varianta A: Přes Supabase SQL Editor (Doporučeno)

1. **Otevři Supabase Dashboard**
   - Přihlas se na [https://supabase.com](https://supabase.com)
   - Vyber svůj projekt

2. **Otevři SQL Editor**
   - V levém menu klikni na "SQL Editor"
   - Klikni na "New Query"

3. **Zkopíruj a spusť tento SQL**

```sql
-- KROK 1: Přidej pole webhook_url do tabulky chatbot_settings
ALTER TABLE public.chatbot_settings 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- KROK 2: Nastav webhook URL pro Wany.Chat
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/22856d03-acea-4174-89ae-1b6f0c8ede71/chat',
    updated_at = NOW()
WHERE chatbot_id = 'vany_chat';

-- KROK 3: Nastav také webhook pro Sana Local Format (pokud ještě nemá)
UPDATE public.chatbot_settings 
SET 
    webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat',
    updated_at = NOW()
WHERE chatbot_id = 'sana_local_format' 
  AND webhook_url IS NULL;

-- OVĚŘENÍ: Zkontroluj, že vše proběhlo v pořádku
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    is_active
FROM public.chatbot_settings 
WHERE is_active = true
ORDER BY chatbot_name;
```

4. **Klikni na "RUN"**

5. **Zkontroluj výsledek**
   - V dolní části by se měla zobrazit tabulka s chatboty
   - Wany.Chat by měl mít webhook URL nastaven

---

### Varianta B: Použij připravený SQL soubor

V root složce projektu najdeš soubor:
```
add_webhook_via_function.sql
```

- Otevři ho v Supabase SQL Editoru
- Spusť celý obsah najednou
- Zkontroluj výsledek

---

## ✅ Po dokončení

Po úspěšném nastavení můžeš spustit ověřovací script:

```bash
node run_add_webhook_via_rpc.js
```

Tento script ověří, že webhook URL je správně nastaven.

---

## 📊 Co webhook dělá

Když uživatel pošle zprávu chatbotu Wany.Chat, aplikace odešle na webhook:

```json
{
  "sessionId": "unique-session-id",
  "action": "sendMessage",
  "chatInput": "uživatelův dotaz",
  "chatHistory": [...],
  "metadata": {
    "categories": [...],
    "labels": [...],
    "publicationTypes": [...]
  }
}
```

Webhook pak vrací odpověď:

```json
{
  "output": "AI odpověď",
  "sources": [
    {
      "id": "book-id",
      "title": "Název knihy",
      "pageContent": "Relevantní obsah",
      "metadata": {...}
    }
  ]
}
```

---

## 🔧 Aktualizace kódu

Po nastavení webhook URL v databázi je potřeba upravit komponentu `SanaChat.tsx`, aby načítala webhook URL z nastavení chatbota místo hardcoded hodnoty.

### Současný stav (hardcoded):
```typescript
const N8N_WEBHOOK_URL = 'https://n8n.srv980546.hstgr.cloud/webhook/97dc857e-352b-47b4-91cb-bc134afc764c/chat';
```

### Budoucí stav (dynamický):
```typescript
const N8N_WEBHOOK_URL = chatbotSettings.webhook_url || 'default-fallback-url';
```

---

## ❓ Potřebuješ pomoc?

Pokud máš problémy s nastavením, zkontroluj:
- ✅ Máš admin přístup k Supabase projektu
- ✅ Pole `webhook_url` bylo úspěšně přidáno
- ✅ Wany.Chat má `chatbot_id` = `'vany_chat'`
- ✅ SQL queries proběhly bez chyb
