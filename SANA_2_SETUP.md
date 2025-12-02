# 🚀 Sana 2 - Setup Guide

## ✅ Co bylo vytvořeno

Byla přidána **nová karta chatbota "Sana 2"** do Správy chatbotů s pokročilým **markdown renderingem**.

---

## 📦 Změny v souborech

### 1. `src/components/SanaChat/SanaChat.tsx`
- ✅ Přidány importy pro `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize`
- ✅ Rozšířen interface `SanaChatProps` o `chatbotId?: string`
- ✅ Rozšířen interface `FilteredSanaChatProps` o `chatbotId?: string`
- ✅ Upravena komponenta `Message` pro podporu markdown renderingu
  - Pokud `chatbotId === 'sana_2'` → používá **ReactMarkdown**
  - Jinak → používá standardní HTML rendering (jako dřív)
- ✅ `ChatWindow` prop `chatbotId` předává se do `Message`
- ✅ `SanaChat`, `SanaChatContent`, `FilteredSanaChat` přijímají `chatbotId`

### 2. `add_sana_2_chatbot.sql` (NOVÝ SOUBOR)
- ✅ SQL script pro přidání Sana 2 do databáze `chatbot_settings`

### 3. `package.json`
- ✅ Závislosti již nainstalovány:
  - `react-markdown`
  - `remark-gfm`
  - `rehype-raw`
  - `rehype-sanitize`

---

## 🔧 Instalace

### Krok 1: Přidat Sana 2 do databáze

Spusťte SQL script v **Supabase SQL editoru**:

```bash
# Otevřete Supabase projekt
# Jděte do: SQL Editor
# Vytvořte nový query a vložte:
```

```sql
-- SQL script z add_sana_2_chatbot.sql
INSERT INTO public.chatbot_settings (
    chatbot_id, 
    chatbot_name, 
    description,
    product_recommendations,
    product_button_recommendations,
    book_database,
    allowed_categories,
    allowed_publication_types,
    is_active
) VALUES 
    (
        'sana_2', 
        'Sana 2', 
        'Vylepšená verze Sana chatu s pokročilým markdown renderingem - podporuje tučný text, seznamy, obrázky, emojis, tabulky a code bloky',
        false,
        false,
        true,
        COALESCE((SELECT ARRAY_AGG(id) FROM public.categories), '{}'),
        COALESCE((SELECT ARRAY_AGG(id) FROM public.publication_types), '{}'),
        true
    )
ON CONFLICT (chatbot_id) DO UPDATE SET
    chatbot_name = EXCLUDED.chatbot_name,
    description = EXCLUDED.description,
    updated_at = NOW();
```

Nebo jednoduše:

```bash
# Spusťte celý soubor
cat add_sana_2_chatbot.sql | supabase db query
```

### Krok 2: Ověřit instalaci

Zkontrolujte, že Sana 2 byla přidána:

```sql
SELECT 
    chatbot_id,
    chatbot_name,
    description,
    is_active
FROM public.chatbot_settings 
WHERE chatbot_id = 'sana_2';
```

**Očekávaný výstup:**

```
chatbot_id | chatbot_name | description                          | is_active
-----------|--------------|--------------------------------------|----------
sana_2     | Sana 2       | Vylepšená verze Sana chatu s...     | true
```

---

## 🚀 Použití

### 1. Otevřít Správu chatbotů

1. V hlavní aplikaci klikněte na **"🤖 Správa chatbotů"**
2. Najděte kartu **"Sana 2"**
3. Měli byste vidět:
   - ✅ Název: **Sana 2**
   - ✅ Popis: Vylepšená verze Sana chatu s pokročilým markdown renderingem
   - ✅ Status: **Aktivní** (zelený badge)
   - ✅ Databáze knih: **Zapnuto** ✓
   - ✅ Produktová doporučení: **Vypnuto** ✗

### 2. Spustit Sana 2 chat

1. Klikněte na tlačítko **"Spustit chat"** u karty Sana 2
2. Otevře se chat s markdown renderingem
3. Zkuste napsat: **"Co jsou Wany?"**

### 3. Testovat markdown výstup

N8N webhook by měl vracet markdown v tomto formátu:

```json
[
  {
    "output": "**Wany** jsou tradiční čínské bylinné směsi 🌿\n\n- **Dang gui** (děhel čínský)\n- **Fu ling** (pornatka kokosová)\n\n![Obrázek](https://example.com/image.jpg)"
  }
]
```

**Sana 2 zobrazí:**
- ✅ **Tučný text** (Wany)
- ✅ Emojis (🌿)
- ✅ Seznamy s odrážkami
- ✅ **Tučné položky seznamu** (Dang gui, Fu ling)
- ✅ Obrázky s rounded corners a shadow

---

## 🎨 Markdown syntaxe

### Podporované elementy:

| Markdown | Výstup |
|----------|--------|
| `**text**` | **Tučný text** |
| `*text*` | *Kurzíva* |
| `# Nadpis` | Nadpis H1 |
| `## Nadpis` | Nadpis H2 |
| `- položka` | Seznam s odrážkami |
| `1. položka` | Číslovaný seznam |
| `[odkaz](url)` | Odkaz |
| `![alt](url)` | Obrázek |
| `` `code` `` | Inline code |
| ` ```code``` ` | Code blok |
| `> citace` | Blockquote |
| `---` | Horizontální čára |
| `| tabulka |` | Tabulka (GFM) |
| `😊` | Emojis |

---

## 🔍 Porovnání: Sana vs Sana 2

| Vlastnost | Původní Sana | Sana 2 |
|-----------|--------------|--------|
| **Formátování** | Prosté HTML | Markdown + HTML |
| **Tučný text** | `<strong>` | `**text**` ✨ |
| **Seznamy** | `<ul><li>` | `- item` ✨ |
| **Obrázky** | Základní | Lazy loading + styled ✨ |
| **Emojis** | Částečně | Plná podpora 😊 ✨ |
| **Code bloky** | Prosté | Syntax highlighted ✨ |
| **Tabulky** | Základní | GitHub Flavored ✨ |
| **Citace** | Ne | Ano (blockquotes) ✨ |

---

## 📝 Konfigurace N8N pro Sana 2

### Formát odpovědi:

N8N webhook musí vracet markdown v poli `output`:

```json
[
  {
    "output": "**Markdown text** s formátováním"
  }
]
```

Nebo standardní formát:

```json
{
  "text": "**Markdown text**",
  "sources": [...]
}
```

### Příklad N8N Node:

```javascript
// N8N Code Node
const aiResponse = $input.first().json.content;

return [{
  json: {
    output: aiResponse,  // ← Markdown text
    sources: []
  }
}];
```

---

## 🐛 Troubleshooting

### Problém: Sana 2 se nezobrazuje ve Správě chatbotů

**Řešení:**
1. Zkontrolujte, že jste spustili SQL script `add_sana_2_chatbot.sql`
2. Ověřte v databázi: `SELECT * FROM chatbot_settings WHERE chatbot_id = 'sana_2'`
3. Obnovte stránku aplikace

---

### Problém: Markdown se nezobrazuje, vidím prosté HTML

**Možné příčiny:**
1. N8N webhook nevrací markdown v poli `output`
2. ChatbotId se nepředává správně do komponenty

**Řešení:**
1. Zkontrolujte formát odpovědi z N8N
2. Otevřete konzoli (F12) a hledejte: `"🆕 Sana 2: chatbotId ="`
3. Mělo by být: `chatbotId = "sana_2"`

---

### Problém: Emojis se nezobrazují

**Řešení:**
- Emojis by měly fungovat automaticky v markdown
- Zkontrolujte, že používáte UTF-8 encoding
- Testujte s jednoduchým emojijem: `😊`

---

### Problém: Code bloky nejsou zvýrazněné

**Poznámka:** Současná implementace podporuje základní styling code bloků (background, padding).
Pro plnou syntax highlighting je potřeba přidat knihovnu jako `react-syntax-highlighter`.

**Aktuální výstup:**
- Code bloky mají šedé pozadí
- Font je monospace
- Inline code má světlé pozadí

---

## ✅ Checklist

- [ ] SQL script `add_sana_2_chatbot.sql` spuštěn v Supabase
- [ ] Sana 2 se zobrazuje ve Správě chatbotů
- [ ] Status karty je "Aktivní" (zelený)
- [ ] Databáze knih je zapnutá
- [ ] N8N webhook vrací markdown formát
- [ ] Otevřel jsem Sana 2 chat a otestoval markdown
- [ ] Tučný text funguje
- [ ] Seznamy fungují
- [ ] Emojis se zobrazují
- [ ] Obrázky se načítají

---

## 📚 Další dokumentace

- **`add_sana_2_chatbot.sql`** - SQL script pro instalaci
- **`src/components/SanaChat/SanaChat.tsx`** - Zdrojový kód
- **Supabase Dashboard** - Pro správu dat

---

## 🎉 Hotovo!

**Sana 2** je připravena k použití! 🚀

Stačí:
1. Spustit SQL script
2. Obnovit aplikaci
3. Otevřít Správu chatbotů
4. Spustit Sana 2 chat
5. Testovat markdown formátování

---

**Vytvořeno:** 2. prosince 2025  
**Verze:** 1.0.0  
**Status:** ✅ Připraveno k nasazení

