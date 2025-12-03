# 🌐 Nastavení webového chatbota (Bublina na medbase.cz)

## 📋 Přehled

Nová funkce umožňuje snadno přepínat, který chatbot se zobrazí v plovoucí bublině na webu medbase.cz **bez nutnosti spouštět SQL skripty**!

---

## ✨ Jak to funguje?

### 1. Databázové pole

Do tabulky `chatbot_settings` bylo přidáno nové pole:

```sql
is_default_web_chatbot BOOLEAN DEFAULT false
```

- Označuje, který chatbot se má zobrazit na webu
- **Pouze jeden chatbot** může mít `is_default_web_chatbot = true`
- Automaticky se zajišťuje pomocí database triggeru

### 2. UI ve správě chatbotů

Ve správě chatbotů (ChatbotManagement) byla přidána nová funkce:

```
┌─────────────────────────────────────┐
│  🤖 Sana Local Format               │
│                                     │
│  📚 Základní funkce                 │
│  ☐ Produktová doporučení            │
│  ☐ Produktové doporučení na tlačítko│
│  ☑ Databáze knih                    │
│  ☑ Zobrazit v bublině na webu  ← 🆕│
│                                     │
│  [Uložit změny]                     │
└─────────────────────────────────────┘
```

---

## 🚀 Jak změnit chatbota na webu

### Krok 1: Spusť SQL script (jednorázově)

Toto je potřeba udělat **pouze jednou** pro přidání nového pole do databáze:

```bash
# V Supabase SQL editoru spusť:
# Soubor: add_default_web_chatbot_field.sql
```

Tento script:
- ✅ Přidá pole `is_default_web_chatbot` do tabulky
- ✅ Vytvoří trigger, který zajistí, že pouze jeden chatbot může být označen
- ✅ Nastaví `sana_local_format` jako výchozí (pokud existuje)

### Krok 2: Přepni chatbota v UI

1. **Otevři aplikaci** (http://localhost:5176/)
2. Klikni na **"Správa chatbotů"**
3. Najdi chatbota, který chceš zobrazit na webu
4. **Zaškrtni** ☑ **"Zobrazit v bublině na webu"**
5. Klikni **"Uložit změny"**

**A je hotovo!** 🎉

- Automaticky se **odstraní zaškrtnutí** u všech ostatních chatbotů
- Na webu se začne zobrazovat nový chatbot
- Žádné SQL skripty, žádný restart!

---

## 💡 Příklady použití

### Přepnout na Sana Local Format:

1. Správa chatbotů → **Sana Local Format**
2. ☑ Zobrazit v bublině na webu
3. Uložit změny

→ Na webu se zobrazí Sana Local Format s markdown renderingem

### Přepnout zpět na původní Sana Chat:

1. Správa chatbotů → **Sana Chat**
2. ☑ Zobrazit v bublině na webu
3. Uložit změny

→ Na webu se zobrazí původní Sana Chat

### Vyzkoušet nový experimentální chatbot:

1. Správa chatbotů → **Nový chatbot**
2. ☑ Zobrazit v bublině na webu
3. Uložit změny

→ Na webu se okamžitě zobrazí nový chatbot

---

## 🔧 Technické detaily

### Database Trigger

Automaticky zajišťuje, že pouze jeden chatbot má `is_default_web_chatbot = true`:

```sql
CREATE OR REPLACE FUNCTION ensure_single_default_web_chatbot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default_web_chatbot = true THEN
        -- Zruš označení u všech ostatních
        UPDATE public.chatbot_settings 
        SET is_default_web_chatbot = false 
        WHERE chatbot_id != NEW.chatbot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Frontend logika

V `ChatbotManagement.tsx`:

```typescript
// Pokud se zapíná "Zobrazit na webu", vypni u všech ostatních
if (feature === 'is_default_web_chatbot' && updatedValue) {
    console.log('🌐 Nastavuji jako výchozí webový chatbot');
    chatbotSettings.forEach(c => {
        if (c.chatbot_id !== chatbotId && c.is_default_web_chatbot) {
            updateLocalSettings(c.chatbot_id, { is_default_web_chatbot: false });
        }
    });
}
```

---

## ✅ Výhody tohoto řešení

### Před (SQL skripty):
```sql
-- Musíš spustit SQL v Supabase:
UPDATE chatbot_settings 
SET chatbot_id = 'sana_local_format' 
WHERE chatbot_id = 'sana_chat';

-- Pak restartovat aplikaci
-- Pak ověřit v databázi...
```
❌ Složité  
❌ Vyžaduje přístup k Supabase  
❌ Musíš znát SQL  
❌ Riziko chyby

### Po (UI toggle):
```
1. Klikni na checkbox ☑
2. Klikni "Uložit"
```
✅ Jednoduché  
✅ Žádný přístup k Supabase  
✅ Žádné SQL znalosti  
✅ Bezpečné (validace)

---

## 🐛 Troubleshooting

### Problém: Nevidím checkbox "Zobrazit v bublině na webu"

**Řešení:**
1. Zkontroluj, že jsi spustil SQL script `add_default_web_chatbot_field.sql`
2. Restartuj aplikaci (Ctrl+C → `npm run dev`)
3. Obnov stránku (F5)

### Problém: Mohu zaškrtnout více chatbotů najednou

**Řešení:**
1. Zkontroluj, že database trigger je vytvořen (viz SQL script)
2. Po zaškrtnutí druhého chatbota by se měl první automaticky odškrtnout
3. Po uložení by měl být v databázi pouze jeden s `is_default_web_chatbot = true`

### Problém: Změny se neprojevují na webu

**Řešení:**
1. Zkontroluj, že jsi klikl **"Uložit změny"**
2. Obnov web (F5)
3. Zkontroluj v Supabase:
   ```sql
   SELECT chatbot_id, chatbot_name, is_default_web_chatbot 
   FROM chatbot_settings 
   WHERE is_default_web_chatbot = true;
   ```

---

## 📊 Dotazy do databáze

### Zjistit, který chatbot je nastavený jako webový:

```sql
SELECT chatbot_id, chatbot_name, is_default_web_chatbot 
FROM chatbot_settings 
WHERE is_default_web_chatbot = true;
```

### Ručně nastavit chatbota jako webový (pokud UI nefunguje):

```sql
-- Nejdřív vypni všechny
UPDATE chatbot_settings SET is_default_web_chatbot = false;

-- Pak zapni ten, který chceš
UPDATE chatbot_settings 
SET is_default_web_chatbot = true 
WHERE chatbot_id = 'sana_local_format';
```

---

## 🎯 Shrnutí

**Před touto změnou:**
- Musel jsi spouštět SQL skripty pro změnu chatbota na webu
- Vyžadovalo to restart aplikace
- Riskoval jsi, že něco rozbijíš

**Po této změně:**
- Klikneš na checkbox ve správě chatbotů
- Klikneš "Uložit"
- Chatbot na webu se okamžitě změní!

**Jednodušší. Rychlejší. Bezpečnější.** 🎉

---

**Vytvořeno:** 2. prosince 2025  
**Status:** ✅ Připraveno k nasazení



