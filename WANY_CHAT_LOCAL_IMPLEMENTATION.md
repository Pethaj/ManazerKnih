# 🔴 Wany.Chat Local - Implementační souhrn

## 📋 Zadání

Vytvořit nový chatbot **Wany.Chat Local** s těmito požadavky:
- ✅ Shodné nastavení jako **Wany.Chat**
- ✅ Jiný webhook: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`
- ✅ **Červená ikona** místo modré
- ✅ Název: **Wany.Chat Local**

## 🎯 Implementované změny

### 1. Databázový script - `add_wany_chat_local.sql`

Vytvořen SQL script pro přidání nového chatbota s:
- `chatbot_id`: `wany_chat_local`
- `chatbot_name`: `Wany.Chat Local`
- `webhook_url`: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`
- Všechna ostatní nastavení shodná s `vany_chat` (Wany.Chat)

**Features:**
- `product_recommendations`: `false`
- `product_button_recommendations`: `false`
- `book_database`: `true` ✅
- `allowed_categories`: Všechny kategorie
- `allowed_publication_types`: Všechny typy publikací
- `use_feed_1`: `true`
- `use_feed_2`: `true`
- `inline_product_links`: `false`
- `enable_product_router`: `true`
- `enable_manual_funnel`: `false`

### 2. ChatbotSelector komponenta - podpora červené ikony

**Soubor:** `src/components/ChatbotSelector/ChatbotSelector.tsx`

**Přidána funkce pro určení barvy ikony:**

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

**Upraveno mapování chatbotů:**
- Dynamická barva ikony podle `chatbot_id`
- Červený hover efekt pro Wany.Chat Local (`hover:bg-red-50`, `hover:border-red-500`, `group-hover:text-red-600`)
- Modrý hover efekt pro ostatní chatboty (původní)

### 3. Markdown rendering podpora

**Soubor:** `src/components/SanaChat/SanaChat.tsx`

**Přidána podpora pro markdown rendering:**

```typescript
const usesMarkdown = chatbotId === 'sana_local_format' 
  || chatbotId === 'vany_chat' 
  || chatbotId === 'eo_smesi' 
  || chatbotId === 'wany_chat_local';  // 🆕 PŘIDÁNO
```

### 4. JavaScript instalační script - `add_wany_chat_local.js`

Vytvořen alternativní způsob instalace přes Node.js:
- Automatické načtení kategorií a typů publikací z databáze
- Upsert chatbota (přepíše existující, pokud již existuje)
- Ověření úspěšné instalace
- Detailní logování průběhu

### 5. Dokumentace

Vytvořeny 3 dokumenty:

#### `WANY_CHAT_LOCAL_QUICK_START.md`
- Stručný rychlý průvodce
- Porovnání s Wany.Chat
- Základní troubleshooting

#### `WANY_CHAT_LOCAL_SETUP.md`
- Kompletní instalační průvodce
- Technické detaily implementace
- Detailní troubleshooting
- Testovací checklist

#### `WANY_CHAT_LOCAL_IMPLEMENTATION.md`
- Tento soubor
- Souhrn všech změn
- Přehled souborů

## 📂 Změněné/vytvořené soubory

### Nové soubory (5)

1. ✨ `add_wany_chat_local.sql` - SQL script pro instalaci
2. ✨ `add_wany_chat_local.js` - JavaScript instalační script
3. ✨ `WANY_CHAT_LOCAL_QUICK_START.md` - Rychlý start
4. ✨ `WANY_CHAT_LOCAL_SETUP.md` - Podrobná dokumentace
5. ✨ `WANY_CHAT_LOCAL_IMPLEMENTATION.md` - Tento soubor

### Upravené soubory (2)

1. 🔧 `src/components/ChatbotSelector/ChatbotSelector.tsx`
   - Přidána funkce `getChatbotIconColor()`
   - Upraveno mapování chatbotů s dynamickými barvami
   
2. 🔧 `src/components/SanaChat/SanaChat.tsx`
   - Přidána podpora markdown renderingu pro `wany_chat_local`

## 🎨 Technické detaily

### Barva ikony

**Červená barva:** `#dc3545`
- Bootstrap danger color
- Dobře čitelná a kontrastní
- Konzistentní s error messages

**Modrá barva (ostatní):** `#2563eb`
- Tailwind bewit-blue
- Původní barva pro všechny ostatní chatboty

### Hover efekty

**Wany.Chat Local (červená):**
```css
hover:bg-red-50       /* Světle červené pozadí */
hover:border-red-500  /* Červený border */
group-hover:text-red-600  /* Červený text */
```

**Ostatní chatboty (modrá):**
```css
hover:bg-blue-50          /* Světle modré pozadí */
hover:border-bewit-blue   /* Modrý border */
group-hover:text-bewit-blue  /* Modrý text */
```

## 🚀 Instalace

### Varianta 1: SQL script (doporučeno)

```bash
# 1. Otevřete Supabase SQL Editor
# 2. Zkopírujte obsah add_wany_chat_local.sql
# 3. Spusťte script
# 4. Ověřte výsledek:

SELECT chatbot_id, chatbot_name, webhook_url 
FROM chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';
```

### Varianta 2: JavaScript

```bash
node add_wany_chat_local.js
```

### Po instalaci

1. Obnovte aplikaci (Ctrl+R / Cmd+R)
2. Otevřete selector chatbotů
3. Ověřte červenou ikonu u Wany.Chat Local

## ✅ Testování

### Test 1: Vizuální kontrola
- [ ] Chatbot se zobrazuje v selectoru
- [ ] Ikona je červená (ne modrá)
- [ ] Název je "Wany.Chat Local"
- [ ] Hover efekt je červený

### Test 2: Funkční test
- [ ] Chat se otevře po kliknutí
- [ ] Zprávy se odesílají
- [ ] Webhook URL je správný
- [ ] Markdown rendering funguje

### Test 3: Databázová kontrola
```sql
-- Ověření nastavení
SELECT 
    chatbot_id,
    chatbot_name,
    webhook_url,
    product_recommendations,
    book_database,
    is_active,
    array_length(allowed_categories, 1) as num_categories
FROM chatbot_settings 
WHERE chatbot_id = 'wany_chat_local';
```

**Očekávaný výsledek:**
- `chatbot_id`: `wany_chat_local`
- `chatbot_name`: `Wany.Chat Local`
- `webhook_url`: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`
- `product_recommendations`: `false`
- `book_database`: `true`
- `is_active`: `true`
- `num_categories`: > 0 (všechny dostupné)

## 🔄 Porovnání s Wany.Chat

| Vlastnost | Wany.Chat | Wany.Chat Local | Status |
|-----------|-----------|-----------------|--------|
| **chatbot_id** | `vany_chat` | `wany_chat_local` | ✅ Jiný |
| **Název** | Wany.Chat | Wany.Chat Local | ✅ Jiný |
| **Ikona** | 🔵 Modrá | 🔴 Červená | ✅ Jiný |
| **Webhook URL** | Původní N8N webhook | `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat` | ✅ Jiný |
| **Nastavení** | Viz původní | **Shodné** | ✅ Shodné |
| **Databáze knih** | `true` | `true` | ✅ Shodné |
| **Kategorie** | Všechny | Všechny | ✅ Shodné |
| **Typy publikací** | Všechny | Všechny | ✅ Shodné |
| **Markdown** | ✅ Ano | ✅ Ano | ✅ Shodné |

## 🐛 Možné problémy a řešení

### Chatbot se nezobrazuje

**Příčina:** Chatbot není aktivní nebo nebyl správně vytvořen

**Řešení:**
```sql
UPDATE chatbot_settings 
SET is_active = true 
WHERE chatbot_id = 'wany_chat_local';
```

### Ikona není červená

**Příčina:** Cache prohlížeče nebo chybějící kód

**Řešení:**
1. Vyčistěte cache (Ctrl+Shift+R)
2. Zkontrolujte `ChatbotSelector.tsx` - funkce `getChatbotIconColor` musí existovat

### Webhook nefunguje

**Příčina:** Špatný webhook URL v databázi

**Řešení:**
```sql
UPDATE chatbot_settings 
SET webhook_url = 'https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat'
WHERE chatbot_id = 'wany_chat_local';
```

## 📊 Statistiky změn

- **Nových souborů:** 5
- **Upravených souborů:** 2
- **Řádků kódu přidáno:** ~150
- **Databázových záznamů:** 1 (nový chatbot)

## 🎉 Hotovo!

Všechny požadavky byly splněny:
- ✅ Nový chatbot **Wany.Chat Local** vytvořen
- ✅ **Červená ikona** implementována
- ✅ **Webhook URL** nastaven na: `https://n8n.srv980546.hstgr.cloud/webhook/15f08634-67e3-4e24-bcff-54ebf80298b8/chat`
- ✅ Nastavení **shodné** s Wany.Chat
- ✅ Dokumentace vytvořena

---

**Vytvořeno:** 2026-01-14  
**Autor:** Cursor AI  
**Verze:** 1.0  
**Status:** ✅ Dokončeno
