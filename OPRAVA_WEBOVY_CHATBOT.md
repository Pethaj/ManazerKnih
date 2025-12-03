# 🔧 Oprava: Webový chatbot nyní respektuje nastavení v administraci

## 🐛 Problém

Když jsi v administraci zaklikl ☑ **"Zobrazit v bublině na webu"** u **Sana Local Format**, na webu se stále zobrazoval původní **Sana Chat** bez markdown formátování.

### Proč to nefungovalo?

V souboru `src/components/SanaChat/ChatWidget.tsx` byl **hardcoded** chatbot ID:

```typescript
// ❌ ŠPATNĚ - pevně zakódováno
const settings = await ChatbotSettingsService.getChatbotSettings('sana_chat');
```

Aplikace vždy načítala `sana_chat`, i když jsi v administraci nastavil jiný chatbot!

---

## ✅ Řešení

### 1. Nová funkce v `chatbotSettingsService.ts`

Přidána funkce `getDefaultWebChatbot()`, která načte chatbot s `is_default_web_chatbot = true`:

```typescript
// 🆕 Načtení výchozího webového chatbota
static async getDefaultWebChatbot(): Promise<ChatbotSettings | null> {
    const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('is_default_web_chatbot', true)
        .eq('is_active', true)
        .single();

    if (error) {
        // Fallback na sana_chat
        return this.getChatbotSettings('sana_chat');
    }

    return data;
}
```

### 2. Aktualizace `ChatWidget.tsx`

Změněno načítání chatbota z hardcoded `'sana_chat'` na dynamické načítání:

```typescript
// ✅ SPRÁVNĚ - načte z databáze podle is_default_web_chatbot
const settings = await ChatbotSettingsService.getDefaultWebChatbot();

if (settings) {
    console.log('✅ Výchozí webový chatbot:', settings.chatbot_id);
    setChatbotId(settings.chatbot_id); // Uložíme ID pro markdown
    setChatbotSettings({...});
}
```

### 3. Předání `chatbotId` do `FilteredSanaChat`

```typescript
<FilteredSanaChat 
    chatbotId={chatbotId}  // ← 🆕 Předáváme ID
    chatbotSettings={chatbotSettings} 
    onClose={() => setIsOpen(false)}
/>
```

---

## 🎯 Jak to teď funguje?

### Když zaklikneš Sana Local Format:

1. ☑ Zobrazit v bublině na webu u **Sana Local Format**
2. Klikneš **"Uložit změny"**
3. V databázi se nastaví:
   ```sql
   UPDATE chatbot_settings 
   SET is_default_web_chatbot = true 
   WHERE chatbot_id = 'sana_local_format';
   
   -- Automaticky se vypne u ostatních
   UPDATE chatbot_settings 
   SET is_default_web_chatbot = false 
   WHERE chatbot_id != 'sana_local_format';
   ```
4. **ChatWidget** načte: `getDefaultWebChatbot()`
5. Najde `sana_local_format` (protože má `is_default_web_chatbot = true`)
6. Předá `chatbotId = 'sana_local_format'` do chatu
7. Chat použije markdown rendering! 🎉

### Když zaklikneš původní Sana Chat:

1. ☑ Zobrazit v bublině na webu u **Sana Chat**
2. Klikneš **"Uložit změny"**
3. **ChatWidget** načte `sana_chat`
4. Chat použije standardní HTML rendering

---

## 🧪 Test

### Krok 1: Obnov stránku

Stiskni **F5** nebo **Ctrl+R**

### Krok 2: Otevři bublinu na webu

Klikni na modrý chat button vpravo dole

### Krok 3: Zkontroluj konzoli

Otevři **F12** → **Console** a hledej:

```
🌐 Načítám výchozí webový chatbot z databáze...
✅ Výchozí webový chatbot načten: sana_local_format Sana Local Format
```

### Krok 4: Testuj dotaz

Napiš: **"Co jsou Wany?"**

#### ✅ Správný výstup (Sana Local Format):

- **Wany** jsou speciální směsi... (tučný text!)
- ### Hlavní výhody: (nadpis!)
- • Pročištění (odrážky!)
- [Obrázek] (stylovaný!)
- ─────────── (horizontální čára!)
- Soubory: (odkazy!)

#### ❌ Špatný výstup (původní Sana Chat):

- `**Wany**` jsou... (hvězdičky viditelné!)
- `###` Hlavní výhody: (mřížky viditelné!)
- `- Pročištění` (pomlčka místo odrážky!)

---

## 📝 Shrnutí změn

### Upravené soubory:

1. **`src/services/chatbotSettingsService.ts`**
   - ✅ Přidána funkce `getDefaultWebChatbot()`

2. **`src/components/SanaChat/ChatWidget.tsx`**
   - ✅ Změněno z hardcoded `'sana_chat'` na dynamické `getDefaultWebChatbot()`
   - ✅ Přidán state `chatbotId` pro tracking
   - ✅ Předávání `chatbotId` do `FilteredSanaChat`

### Co se nezměnilo:

- ❌ `SanaChat.tsx` - už bylo správně (používá `chatbotId === 'sana_local_format'`)
- ❌ `ChatbotManagement.tsx` - už bylo správně (toggle funguje)
- ❌ Databáze - už bylo správně (pole `is_default_web_chatbot` existuje)

---

## 🎉 Výsledek

**Nyní funguje přepínání chatbotů!**

- ✅ V administraci zaklikneš, který chatbot chceš na webu
- ✅ Na webu se zobrazí správný chatbot
- ✅ Sana Local Format používá markdown rendering
- ✅ Původní Sana Chat používá HTML rendering
- ✅ Žádné SQL skripty!

---

## 🐛 Troubleshooting

### Problém: Stále vidím původní Sana Chat

**Řešení:**
1. Obnov stránku (F5)
2. Vyčisti cache (Ctrl+Shift+R)
3. Zkontroluj konzoli - hledej log:
   ```
   ✅ Výchozí webový chatbot načten: sana_local_format
   ```

### Problém: V konzoli je chyba "Could not find..."

**Řešení:**
- Spusť SQL script `SPUSTIT_TENTO_SQL.sql` v Supabase
- Pole `is_default_web_chatbot` musí existovat v databázi

### Problém: Markdown se nezobrazuje

**Řešení:**
1. Zkontroluj konzoli - mělo by být:
   ```
   chatbotId: "sana_local_format"
   ```
2. Pokud je `chatbotId: "sana_chat"`, zkontroluj databázi:
   ```sql
   SELECT chatbot_id, is_default_web_chatbot 
   FROM chatbot_settings;
   ```

---

**Vytvořeno:** 2. prosince 2025  
**Status:** ✅ OPRAVENO - Web nyní respektuje nastavení v administraci!



