# Troubleshooting: Chatbot Settings - Chyby při ukládání

## Problém: "Cannot coerce the result to a single JSON object" (Error PGRST116)

### Příznaky
- Při ukládání nastavení chatbota se zobrazí chyba HTTP 406
- V konzoli vidíte: `PGRST116: The result contains 0 rows`
- Chybová zpráva: "Chatbot s ID 'xxx' nebyl nalezen v databázi"

### Příčina
Záznam pro daného chatbota neexistuje v tabulce `chatbot_settings` v databázi Supabase.

### Řešení

#### Krok 1: Ověření stavu databáze
1. Otevřete Supabase Dashboard
2. Přejděte do **SQL Editor**
3. Spusťte diagnostický script `check_chatbot_settings.sql`:
   ```sql
   -- Zkontroluje existenci tabulky a záznamů
   SELECT * FROM public.chatbot_settings;
   ```

#### Krok 2: Oprava - Vytvoření chybějících záznamů
1. V SQL Editoru spusťte script `fix_chatbot_settings.sql`
2. Tento script vytvoří výchozí chatboty:
   - `sana_chat` - Hlavní chatbot pro lékařskou literaturu
   - `product_chat` - Chatbot s produktovými doporučeními
   - `test_chat` - Testovací chatbot

#### Krok 3: Ověření
1. Obnovte stránku v aplikaci
2. Otevřete **Správu chatbotů**
3. Měli byste vidět všechny chatboty načtené z databáze
4. Zkuste provést změnu a uložit - nyní by mělo fungovat

## Problém s RLS (Row Level Security) politikami

### Příznaky
- V konzoli vidíte: ✅ "Chatbot existuje, provádím UPDATE"
- Ale pak: ❌ "UPDATE nevrátil žádný řádek"
- Chyba: "UPDATE selhal - pravděpodobně nemáte oprávnění"

### Diagnostika
```sql
-- Zobrazí všechny RLS politiky pro tabulku chatbot_settings
SELECT 
    policyname,
    cmd,
    roles,
    permissive
FROM pg_policies 
WHERE tablename = 'chatbot_settings'
ORDER BY cmd;
```

### Požadované politiky
Měli byste vidět **4 politiky**:
- `Allow read access to chatbot_settings` - SELECT - {public}
- `Allow insert for authenticated users` - INSERT - {authenticated}
- `Allow update for authenticated users` - UPDATE - {authenticated}
- `Allow delete for authenticated users` - DELETE - {authenticated}

### Řešení
Pokud politiky chybí nebo jsou nesprávné, spusťte:
```bash
fix_rls_policies.sql
```

Tento script:
1. Odstraní všechny staré konfliktní politiky
2. Vytvoří nové správné politiky
3. Zajistí že RLS je povoleno
4. Zobrazí ověření vytvořených politik

## Ověření přihlášení (důležité pro RLS!)

RLS politiky vyžadují **autentifikovaného uživatele** pro UPDATE operace.

### Jak ověřit že jste přihlášeni:
1. Otevřete konzoli prohlížeče (F12)
2. V Console zadejte:
```javascript
const { data: { user } } = await supabase.auth.getUser()
console.log('Přihlášený uživatel:', user)
```

3. Měli byste vidět objekt s `id`, `email`, atd.
4. Pokud vidíte `null`, **nejste přihlášeni** → přihlaste se!

### Alternativní ověření v Application Storage:
1. F12 → Application tab
2. Storage → Local Storage → váš domain
3. Hledejte klíč začínající `sb-` obsahující `access_token`

## Ladění v konzoli prohlížeče

Pro detailní diagnostiku otevřete Developer Console (F12) a sledujte:

1. **Console tab**: Hledejte logování z `chatbotSettingsService.ts`:
   - 🔍 "Aktualizuji chatbota s ID: ..."
   - ✅ "Chatbot existuje, provádím UPDATE"
   - ❌ "UPDATE nevrátil žádný řádek - pravděpodobně problém s RLS"
   - ❌ "Chatbot s ID 'xxx' nebyl nalezen v databázi"

2. **Network tab**: Zkontrolujte PATCH požadavky na `/rest/v1/chatbot_settings`
   - Měli byste vidět header `Authorization: Bearer <token>`
   - HTTP 200 = úspěch
   - HTTP 406 = problém s RLS nebo chybějící záznam

## Manuální vytvoření chatbota

Pokud potřebujete vytvořit vlastního chatbota:

```sql
INSERT INTO public.chatbot_settings (
    chatbot_id, 
    chatbot_name, 
    description,
    product_recommendations,
    book_database,
    allowed_categories,
    allowed_publication_types,
    is_active
) VALUES (
    'muj_chatbot',  -- Unikátní ID
    'Můj Chatbot',  -- Lidsky čitelný název
    'Popis mého chatbota',
    false,  -- Produktová doporučení
    true,   -- Databáze knih
    ARRAY[]::UUID[],  -- Prázdné pole kategorií
    ARRAY[]::UUID[],  -- Prázdné pole typů publikací
    true    -- Aktivní
);
```

## Kontaktní informace

Pokud problém přetrvává:
1. Zkontrolujte Supabase logy v Dashboard → Logs
2. Ověřte, že máte správná oprávnění k tabulce
3. Zkontrolujte, že používáte správný projekt v Supabase

## Související soubory

- `/src/services/chatbotSettingsService.ts` - Služba pro práci s nastavením
- `/src/components/ChatbotManagement.tsx` - UI komponenta
- `create_chatbot_settings_table.sql` - Inicializační script
- `fix_chatbot_settings.sql` - Opravný script
- `check_chatbot_settings.sql` - Diagnostický script

