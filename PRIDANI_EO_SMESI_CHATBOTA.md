# 🤖 Přidání chatbota "EO-Smesi"

## 📋 Přehled

Tento dokument popisuje, jak přidat nového chatbota **"EO-Smesi"** do systému správy chatbotů.

### Specifikace

- **Název:** EO-Smesi
- **Chatbot ID:** `eo_smesi`
- **Nastavení:** Stejné jako Wany Chat
- **Webhook pro odpovědi:** `https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat`
- **Webhook pro produktový funnel:** `https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat` (sdílený se všemi chatboty)

---

## 🚀 Metoda 1: Přes Supabase SQL Editor (Doporučeno)

### Postup

1. **Otevři Supabase Dashboard**
   - Přihlas se na [https://supabase.com](https://supabase.com)
   - Vyber svůj projekt

2. **Otevři SQL Editor**
   - V levém menu klikni na "SQL Editor"
   - Klikni na "New Query"

3. **Spusť SQL script**
   - Otevři soubor `add_eo_smesi_chatbot.sql` z root složky projektu
   - Zkopíruj celý obsah
   - Vlož do SQL Editoru
   - Klikni na "RUN"

4. **Zkontroluj výsledek**
   - V dolní části by se měly zobrazit 2 tabulky:
     - První: Detail nově přidaného chatbota "EO-Smesi"
     - Druhá: Porovnání EO-Smesi s Wany Chat

### Očekávaný výsledek

```
chatbot_id: eo_smesi
chatbot_name: EO-Smesi
webhook_url: https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
is_active: true
book_database: true
product_recommendations: false
```

---

## 🔧 Metoda 2: Přes Node.js script

### Postup

1. **Ujisti se, že máš .env.local**
   - Soubor `.env.local` musí obsahovat:
     ```
     NEXT_PUBLIC_SUPABASE_URL=<your-url>
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
     ```

2. **Spusť script**
   ```bash
   node add_eo_smesi_chatbot.js
   ```

3. **Zkontroluj výstup**
   - Script by měl vypsat detailní informace o přidaném chatbotu
   - Na konci by měla být tabulka s porovnáním EO-Smesi a Wany Chat

### Očekávaný výstup

```
🚀 Spouštím přidání chatbota "EO-Smesi"...

📋 KROK 1: Načítám všechny kategorie...
✅ Načteno X kategorií

📋 KROK 2: Načítám všechny typy publikací...
✅ Načteno Y typů publikací

📋 KROK 3: Přidávám chatbota "EO-Smesi"...
✅ Chatbot "EO-Smesi" byl úspěšně přidán/aktualizován

📋 KROK 4: Ověřuji přidaný chatbot...
✅ Ověření úspěšné!

📊 Detail chatbota:
   ID: eo_smesi
   Název: EO-Smesi
   Webhook URL: https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
   Aktivní: ✅ Ano
   ...

✅ HOTOVO! Chatbot "EO-Smesi" je připraven k použití.
```

---

## ⚙️ Nastavení chatbota

### Základní nastavení (stejné jako Wany Chat)

| Nastavení | Hodnota | Popis |
|-----------|---------|-------|
| `chatbot_id` | `eo_smesi` | Unikátní ID chatbota |
| `chatbot_name` | `EO-Smesi` | Zobrazovaný název |
| `product_recommendations` | `false` | Produktová doporučení vypnuta |
| `product_button_recommendations` | `false` | Produktové tlačítko vypnuto |
| `book_database` | `true` | Přístup k databázi knih |
| `is_active` | `true` | Chatbot je aktivní |
| `use_feed_1` | `true` | Použít feed 1 |
| `use_feed_2` | `true` | Použít feed 2 |
| `inline_product_links` | `false` | Inline produktové linky vypnuty |
| `enable_product_router` | `true` | Produktový router zapnut |
| `enable_manual_funnel` | `false` | Manuální funnel vypnut |
| `allowed_categories` | `ALL` | Všechny kategorie povoleny |
| `allowed_publication_types` | `ALL` | Všechny typy publikací povoleny |

### Webhooky

#### Webhook pro odpovědi uživatele
```
https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat
```

**Co se posílá:**
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

**Co se očekává zpět:**
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

#### Webhook pro produktový funnel
```
https://n8n.srv980546.hstgr.cloud/webhook/8eda4352-19ca-48fe-8325-855ecf554fc3/chat
```

**Poznámka:** Tento webhook je **sdílený** pro všechny chatboty a je hardcoded v komponentě `ManualFunnelButton.tsx`.

---

## ✅ Ověření instalace

### Kontrola v databázi

Spusť tento SQL dotaz:

```sql
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    is_active,
    book_database,
    product_recommendations,
    array_length(allowed_categories, 1) as num_categories,
    array_length(allowed_publication_types, 1) as num_publication_types
FROM public.chatbot_settings 
WHERE chatbot_id = 'eo_smesi';
```

### Kontrola v admin rozhraní

1. Otevři aplikaci
2. Přihlas se jako admin
3. Jdi do "Správa chatbotů" (pokud existuje tato stránka)
4. Měl by být viditelný chatbot "EO-Smesi"

---

## 🔄 Porovnání s Wany Chat

Chatbot EO-Smesi má **identické nastavení** jako Wany Chat, kromě:

| Vlastnost | Wany Chat | EO-Smesi |
|-----------|-----------|----------|
| `chatbot_id` | `vany_chat` | `eo_smesi` |
| `chatbot_name` | `Vany.chat` | `EO-Smesi` |
| `webhook_url` | `...22856d03-acea.../chat` | `...20826009-b007.../chat` |

Vše ostatní (kategorie, typy publikací, flags) je **stejné**.

---

## 🧪 Testování

### Test 1: Zobrazení chatbota v seznamu

```sql
SELECT chatbot_id, chatbot_name, is_active 
FROM chatbot_settings 
WHERE is_active = true
ORDER BY chatbot_name;
```

Měl by být vidět "EO-Smesi" mezi aktivními chatboty.

### Test 2: Kontrola webhooku

```bash
curl -X POST https://n8n.srv980546.hstgr.cloud/webhook/20826009-b007-46b2-8d90-0c461113d263/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "action": "sendMessage",
    "chatInput": "Testovací dotaz",
    "chatHistory": [],
    "metadata": {}
  }'
```

Měl by vrátit odpověď od N8N.

### Test 3: Funkční test v aplikaci

1. V aplikaci vyber chatbot "EO-Smesi"
2. Pošli testovací zprávu
3. Zkontroluj, že:
   - Zpráva se odešle na správný webhook
   - Přijde odpověď z N8N
   - Zobrazí se korektně v UI

---

## 🐛 Řešení problémů

### Chatbot se nepřidává

**Možné příčiny:**
- Chybějící práva k databázi
- Konflikt s existujícím `chatbot_id`
- Chybná struktura tabulky `chatbot_settings`

**Řešení:**
1. Zkontroluj, že máš admin přístup k Supabase
2. Ověř, že tabulka `chatbot_settings` existuje
3. Zkontroluj RLS policies

### Webhook nefunguje

**Možné příčiny:**
- Špatná URL
- N8N workflow není aktivní
- CORS problémy

**Řešení:**
1. Zkontroluj URL (zkopíruj přesně z dokumentace)
2. Ověř, že N8N workflow je aktivní
3. Test webhook přímo přes curl (viz výše)

### Chatbot se nezobrazuje v UI

**Možné příčiny:**
- `is_active = false`
- Cache problém
- Frontend nenačítá nové chatboty

**Řešení:**
1. Ověř v databázi: `is_active = true`
2. Vyčisti browser cache
3. Restart aplikace

---

## 📚 Související soubory

- `add_eo_smesi_chatbot.sql` - SQL script pro přidání
- `add_eo_smesi_chatbot.js` - Node.js script pro přidání
- `src/services/chatbotSettingsService.ts` - TypeScript interface
- `src/components/ManualFunnelButton.tsx` - Produktový funnel webhook (hardcoded)

---

## 📝 Poznámky pro vývojáře

1. **Webhook URL je unikátní** pro každý chatbot (pole `webhook_url` v databázi)
2. **Produktový funnel webhook je sdílený** (hardcoded v `ManualFunnelButton.tsx`)
3. Pokud chceš změnit nastavení EO-Smesi, použij UPDATE query nebo admin rozhraní
4. Při přidávání nových chatbotů dodržuj konvenci pojmenování:
   - `chatbot_id`: snake_case (např. `eo_smesi`)
   - `chatbot_name`: Human readable (např. `EO-Smesi`)

---

## ✅ Checklist

- [ ] SQL script spuštěn v Supabase
- [ ] Chatbot viditelný v databázi
- [ ] Webhook URL správně nastaven
- [ ] Chatbot je aktivní (`is_active = true`)
- [ ] Test webhook funguje
- [ ] Chatbot se zobrazuje v UI
- [ ] Odesílání zpráv funguje
- [ ] Přijímání odpovědí funguje

---

**Datum vytvoření:** 2026-01-09  
**Poslední aktualizace:** 2026-01-09


