# Nastavení Chatbotů - Rychlý Start

## Problém
Ve správě chatbotů se nezobrazují žádné chatboty, protože nejsou vytvořeni v databázi.

## Řešení

### Krok 1: Spusťte SQL Script v Supabase

1. Otevřete Supabase Dashboard
2. Přejděte do **SQL Editor**
3. Zkopírujte celý obsah souboru `create_chatbot_settings_table.sql`
4. Vložte ho do SQL editoru
5. Klikněte na **Run** (nebo stiskněte Ctrl/Cmd + Enter)

### Krok 2: Ověření

Po spuštění scriptu byste měli vidět:
```
✅ Tabulka chatbot_settings vytvořena
✅ 3 chatboti vytvořeni:
   - sana_chat (Sana Chat)
   - product_chat (Product Chat)  
   - test_chat (Testovací Chat)
```

### Krok 3: Obnovte stránku

Po úspěšném spuštění SQL scriptu:
1. Zavřete správu chatbotů (pokud je otevřená)
2. Obnovte stránku aplikace (F5 nebo Ctrl/Cmd + R)
3. Znovu otevřete správu chatbotů
4. Měli byste vidět všechny 3 chatboty

## Co obsahují jednotlivé chatboty?

### 🤖 Sana Chat
- **ID:** `sana_chat`
- **Produktová doporučení:** ❌ Ne
- **Databáze knih:** ✅ Ano
- **Kategorie:** Všechny
- **Typy publikací:** Všechny
- **Použití:** Hlavní chatbot pro vyhledávání v lékařské literatuře

### 🛒 Product Chat
- **ID:** `product_chat`
- **Produktová doporučení:** ✅ Ano
- **Databáze knih:** ❌ Ne
- **Použití:** Chatbot zaměřený na doporučování produktů

### 🧪 Testovací Chat
- **ID:** `test_chat`
- **Produktová doporučení:** ❌ Ne
- **Databáze knih:** ✅ Ano (s omezeným přístupem)
- **Typy publikací:** Pouze veřejné
- **Použití:** Pro testování nových funkcí

## Řešení problémů

### Chatboti se stále nezobrazují

1. **Zkontrolujte konzoli prohlížeče** (F12):
   - Hledejte chybové hlášky týkající se `chatbot_settings`
   - Zkontrolujte, zda se data načítají

2. **Ověřte RLS politiky v Supabase:**
   - Přejděte do Authentication > Policies
   - Zkontrolujte, že tabulka `chatbot_settings` má povolenou politiku pro čtení

3. **Manuální kontrola v databázi:**
   ```sql
   SELECT chatbot_id, chatbot_name, is_active 
   FROM public.chatbot_settings;
   ```

### Chyba při spuštění SQL scriptu

Pokud se objeví chyba typu "relation does not exist":
- Zkontrolujte, že existují tabulky `categories` a `publication_types`
- Možná budete muset nejprve spustit `database_setup.sql`

### Chyba oprávnění

Pokud se objeví chyba "permission denied":
- Ujistěte se, že jste přihlášeni jako administrátor
- Zkontrolujte RLS politiky pro tabulku `chatbot_settings`

## Další kroky

Po úspěšném vytvoření chatbotů můžete:
1. **Upravit nastavení** jednotlivých chatbotů přímo ve správě
2. **Přidat nebo odebrat kategorie** podle potřeby
3. **Nastavit typy publikací** pro jednotlivé chatboty
4. **Otestovat chaty** pomocí tlačítka "Spustit chat s nastavením"




