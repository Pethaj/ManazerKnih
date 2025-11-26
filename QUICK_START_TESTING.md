# 🚀 Rychlý start: Testování nastavení chatbotů

## ⚡ 3 kroky k otestování

### 1️⃣ Spustit SQL migraci (2 minuty)

```bash
# Otevřete Supabase Dashboard
# → SQL Editor
# → Nový query
# → Zkopírujte obsah souboru: MIGRATION_CHATBOT_SETTINGS.sql
# → Klikněte Run
```

**Očekávaný výstup:**
```
✅ MIGRACE CHATBOT_SETTINGS DOKONČENA!
📊 Celkový počet chatbotů: 3
```

---

### 2️⃣ Restartovat aplikaci (1 minuta)

```bash
# V terminálu:
npm run dev

# Nebo hard refresh v prohlížeči:
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

---

### 3️⃣ Otestovat v UI (5 minut)

#### A) Zapnout funkci

1. **Otevřete aplikaci** → Klikněte na ikonu ⚙️ (Správa chatbotů)
2. **Vyberte chatbota** → např. "Sana Chat"
3. **Zaškrtněte funkci:**
   ```
   ☑️ Produktové doporučení na tlačítko
   ```
4. **Klikněte:** `[Uložit nastavení]`
5. **Ověřte zprávu:** `✅ Nastavení chatbota bylo úspěšně uloženo!`

#### B) Otevřít chat

1. **Ve stejné kartě chatbota klikněte:** `[💬 Spustit chat s nastavením]`
2. **Otevřete Developer Console** (F12)
3. **Hledejte v konzoli:**
   ```
   🤖 Načítám nastavení pro chatbota: sana_chat
   📊 Načtené filtrace...
   ```

#### C) Poslat zprávu

1. **Napište:** "Potřebuji něco na bolest hlavy"
2. **Odešlete zprávu**
3. **Očekávejte:**
   - ✅ Odpověď chatbota
   - ✅ **Tlačítko pod odpovědí:** `[💊 Doporučit produkty]`

#### D) Kliknout na tlačítko

1. **Klikněte na:** `[💊 Doporučit produkty]`
2. **Očekávejte:**
   - ⏳ "Načítám doporučení..."
   - 📦 Carousel s produkty

#### E) Vypnout funkci

1. **Vraťte se do Správy chatbotů**
2. **Odškrtněte:** ☐ Produktové doporučení na tlačítko
3. **Klikněte:** `[Uložit nastavení]`
4. **Zavřete a znovu otevřete chat**
5. **Pošlete stejnou zprávu**
6. **Očekávejte:**
   - ✅ Odpověď chatbota
   - ❌ **Tlačítko se NEZOBRAZÍ**

---

## ✅ Checklist

- [ ] Migrace proběhla úspěšně
- [ ] Aplikace restartována
- [ ] Funkce zapnuta v UI
- [ ] Nastavení uloženo do DB
- [ ] Chat otevřen s novým nastavením
- [ ] Tlačítko se zobrazuje
- [ ] Kliknutí na tlačítko načte produkty
- [ ] Funkce vypnuta v UI
- [ ] Tlačítko se NEzobrazuje

---

## 🐛 Řešení problémů

### Tlačítko se nezobrazuje

**Zkontrolujte konzoli:**
```javascript
// Měli byste vidět:
🔘 Renderuji ProductRecommendationButton
```

**Pokud NE, zkontrolujte:**
1. Je `product_button_recommendations === true` v DB?
2. Je `sessionId` definováno?
3. Je `lastUserQuery` definováno?

**SQL kontrola:**
```sql
SELECT chatbot_id, product_button_recommendations
FROM chatbot_settings
WHERE chatbot_id = 'sana_chat';
```

---

### "Nepodařilo se uložit nastavení"

**Možné příčiny:**
1. RLS politiky nepovolují UPDATE
2. Edge funkce není deploynutá

**Řešení:**
```sql
-- Spusťte v SQL Editoru:
-- Z souboru: QUICK_FIX_RLS.sql
```

---

### Aplikace neukazuje změny

**Hard refresh:**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Nebo:**
```bash
npm run dev
```

---

## 📊 Ověření v databázi

```sql
-- Zkontrolujte, že sloupce existují
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'chatbot_settings' 
    AND column_name IN (
        'product_button_recommendations',
        'use_feed_1',
        'use_feed_2'
    );

-- Zkontrolujte hodnoty pro chatboty
SELECT 
    chatbot_id,
    chatbot_name,
    product_recommendations,
    product_button_recommendations,
    book_database,
    use_feed_1,
    use_feed_2,
    is_active
FROM chatbot_settings
ORDER BY chatbot_id;
```

---

## 🎯 Očekávané výsledky

### Když je funkce ZAPNUTA:
```
👤 User: "Potřebuji něco na bolest hlavy"

🤖 Bot: "Pro bolest hlavy doporučuji následující..."

     [💊 Doporučit produkty]  ← TLAČÍTKO SE ZOBRAZÍ
```

### Když je funkce VYPNUTA:
```
👤 User: "Potřebuji něco na bolest hlavy"

🤖 Bot: "Pro bolest hlavy doporučuji následující..."

     (žádné tlačítko)  ← TLAČÍTKO SE NEZOBRAZÍ
```

---

## 📝 Poznámky

- **První načtení může trvat déle** - N8N webhook může být "studený start"
- **Konzole je váš přítel** - všechny logy mají emoji pro snadné hledání
- **Testujte s různými chatboty** - každý má své nastavení
- **Změny v DB se projeví až po znovunačtení chatu** - nezapomeňte zavřít a otevřít chat

---

## 🔍 Důležité emoji v konzoli

- 🔘 = ProductRecommendationButton
- 🎠 = ProductCarousel
- 📊 = Načítání nastavení
- 🤖 = Chatbot operace
- 💾 = Ukládání
- ✅ = Úspěch
- ❌ = Chyba

---

**Čas testování:** ~10 minut  
**Obtížnost:** Snadná  
**Verze:** 1.0

